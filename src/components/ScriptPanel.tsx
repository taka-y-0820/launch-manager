import { useState, useRef, useEffect, useCallback } from "react";
import { api, type ScriptOutput, type ScriptComplete } from "../api";
import type {
  Script,
  Environment,
  Schedule,
  TerminalSession,
  TerminalStatus,
  ScriptLanguage,
} from "../types";

// Helper: Get default script content for each language
function getDefaultContent(lang: ScriptLanguage): string {
  switch (lang) {
    case "bash":
      return '#!/bin/bash\necho "Hello from Bash!"\n';
    case "powershell":
      return 'Write-Host "Hello from PowerShell!"\n';
    case "batch":
      return '@echo off\necho Hello from Batch!\n';
    case "python":
      return 'print("Hello from Python!")\n';
    case "node":
      return 'console.log("Hello from Node.js!");\n';
    default:
      return "";
  }
}

interface ScriptPanelProps {
  scripts: Script[];
  environments: Environment[];
  schedules: Schedule[];
  onSaveScript: (script: Script) => void;
  onDeleteScript: (scriptId: string) => void;
  onSaveEnvironment: (env: Environment) => void;
  onDeleteEnvironment: (envId: string) => void;
  onSaveSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

type TabType = "scripts" | "environments" | "schedules" | "terminal";

export function ScriptPanel({
  scripts,
  environments,
  schedules,
  onSaveScript,
  onDeleteScript,
  onSaveEnvironment,
  onDeleteEnvironment,
  onSaveSchedule,
  onDeleteSchedule,
}: ScriptPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("scripts");
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null);

  // Listen for script output events
  useEffect(() => {
    let unlistenOutput: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;
    let isSubscribed = true;

    const setupListeners = async () => {
      // Prevent duplicate listeners in React Strict Mode
      if (!isSubscribed) return;

      unlistenOutput = await api.onScriptOutput((output: ScriptOutput) => {
        if (!isSubscribed) return;
        setTerminals((prev) =>
          prev.map((t) =>
            t.id === output.session_id
              ? {
                  ...t,
                  output: [
                    ...t.output,
                    output.is_stderr ? `[stderr] ${output.line}` : output.line,
                  ],
                }
              : t
          )
        );
      });

      unlistenComplete = await api.onScriptComplete((complete: ScriptComplete) => {
        if (!isSubscribed) return;
        setTerminals((prev) =>
          prev.map((t) =>
            t.id === complete.session_id
              ? {
                  ...t,
                  status: complete.success ? "completed" : "failed",
                  exit_code: complete.exit_code ?? undefined,
                }
              : t
          )
        );
      });
    };

    setupListeners();

    return () => {
      isSubscribed = false;
      unlistenOutput?.();
      unlistenComplete?.();
    };
  }, []);

  // Add a new terminal session and optionally run a script
  const addTerminal = useCallback(
    async (scriptId?: string, envId?: string) => {
      const script = scriptId ? scripts.find((s) => s.id === scriptId) : null;
      const env = envId ? environments.find((e) => e.id === envId) : null;

      const sessionId = `term-${Date.now()}`;
      const session: TerminalSession = {
        id: sessionId,
        name: script?.name || "New Terminal",
        script_id: scriptId,
        environment_id: envId,
        output: [],
        status: "idle",
      };

      setTerminals((prev) => [...prev, session]);
      setActiveTerminal(sessionId);
      setActiveTab("terminal");

      // If script and environment provided, run it
      if (script && env) {
        try {
          // Update status to running
          setTerminals((prev) =>
            prev.map((t) =>
              t.id === sessionId
                ? {
                    ...t,
                    status: "running" as TerminalStatus,
                    started_at: new Date().toISOString(),
                    output: [`$ Running "${script.name}" in ${env.name}...`, ""],
                  }
                : t
            )
          );

          // Call the backend to run the script
          await api.runScript({
            session_id: sessionId,
            script_content: script.content,
            language: script.language,
            working_dir: undefined,
            env_vars: env.variables,
          });
        } catch (e) {
          setTerminals((prev) =>
            prev.map((t) =>
              t.id === sessionId
                ? {
                    ...t,
                    status: "failed" as TerminalStatus,
                    output: [...t.output, `Error: ${String(e)}`],
                  }
                : t
            )
          );
        }
      }
    },
    [scripts, environments]
  );

  // Stop a running script
  const stopTerminal = useCallback(async (sessionId: string) => {
    try {
      await api.stopScript(sessionId);
      setTerminals((prev) =>
        prev.map((t) =>
          t.id === sessionId
            ? { ...t, status: "failed" as TerminalStatus, output: [...t.output, "", "Process terminated by user."] }
            : t
        )
      );
    } catch (e) {
      console.error("Failed to stop script:", e);
    }
  }, []);

  const closeTerminal = useCallback((id: string) => {
    // Stop if running
    const term = terminals.find((t) => t.id === id);
    if (term?.status === "running") {
      api.stopScript(id).catch(console.error);
    }

    setTerminals((prev) => prev.filter((t) => t.id !== id));
    setActiveTerminal((current) => {
      if (current === id) {
        const remaining = terminals.filter((t) => t.id !== id);
        return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      }
      return current;
    });
  }, [terminals]);

  const tabs: { key: TabType; label: string; icon: JSX.Element }[] = [
    { key: "scripts", label: "Scripts", icon: <CodeIcon /> },
    { key: "environments", label: "Environments", icon: <EnvIcon /> },
    { key: "schedules", label: "Schedules", icon: <ClockIcon /> },
    {
      key: "terminal",
      label: `Terminal${terminals.length > 0 ? ` (${terminals.length})` : ""}`,
      icon: <TerminalIcon />,
    },
  ];

  return (
    <div className="sp">
      {/* Tab bar */}
      <div className="sp-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`sp-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="sp-content">
        {activeTab === "scripts" && (
          <ScriptsTab
            scripts={scripts}
            environments={environments}
            onSave={onSaveScript}
            onDelete={onDeleteScript}
            onRun={addTerminal}
          />
        )}
        {activeTab === "environments" && (
          <EnvironmentsTab
            environments={environments}
            onSave={onSaveEnvironment}
            onDelete={onDeleteEnvironment}
          />
        )}
        {activeTab === "schedules" && (
          <SchedulesTab
            schedules={schedules}
            scripts={scripts}
            environments={environments}
            onSave={onSaveSchedule}
            onDelete={onDeleteSchedule}
          />
        )}
        {activeTab === "terminal" && (
          <TerminalTab
            terminals={terminals}
            activeTerminal={activeTerminal}
            onSelectTerminal={setActiveTerminal}
            onCloseTerminal={closeTerminal}
            onNewTerminal={() => addTerminal()}
            onStopTerminal={stopTerminal}
          />
        )}
      </div>
    </div>
  );
}

// ===== SCRIPTS TAB =====

interface ScriptsTabProps {
  scripts: Script[];
  environments: Environment[];
  onSave: (script: Script) => void;
  onDelete: (id: string) => void;
  onRun: (scriptId: string, envId: string) => void;
}

function ScriptsTab({ scripts, environments, onSave, onDelete, onRun }: ScriptsTabProps) {
  const [selected, setSelected] = useState<Script | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [runEnv, setRunEnv] = useState<string | null>(null);

  const createNew = () => {
    const defaultLang: ScriptLanguage = "powershell"; // Windows default
    const newScript: Script = {
      id: `script-${Date.now()}`,
      name: "New Script",
      content: getDefaultContent(defaultLang),
      language: defaultLang,
      environments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSelected(newScript);
    setIsEditing(true);
  };

  const handleSave = (script: Script) => {
    onSave({ ...script, updated_at: new Date().toISOString() });
    setIsEditing(false);
  };

  const [noEnvError, setNoEnvError] = useState(false);

  const handleRun = (script: Script) => {
    if (environments.length === 0) {
      setNoEnvError(true);
      setTimeout(() => setNoEnvError(false), 3000);
      return;
    }
    if (environments.length === 1) {
      onRun(script.id, environments[0].id);
    } else {
      setSelected(script);
      setRunEnv(script.id);
    }
  };

  return (
    <div className="sp-scripts">
      {/* No environment error toast */}
      {noEnvError && (
        <div className="sp-toast-error">
          先に「Environments」タブで環境を作成してください
        </div>
      )}

      {/* Script list */}
      <div className="sp-list">
        <div className="sp-list-header">
          <span>Scripts ({scripts.length})</span>
          <button className="sp-btn-icon" onClick={createNew}>
            <PlusIcon />
          </button>
        </div>
        <div className="sp-list-items">
          {scripts.length === 0 ? (
            <div className="sp-empty">
              <CodeIcon />
              <p>No scripts yet</p>
              <button className="sp-btn-sm" onClick={createNew}>
                Create Script
              </button>
            </div>
          ) : (
            scripts.map((script) => (
              <div
                key={script.id}
                className={`sp-list-item ${selected?.id === script.id ? "active" : ""}`}
                onClick={() => { setSelected(script); setIsEditing(false); }}
              >
                <div className="sp-list-item-icon">
                  <LangIcon lang={script.language} />
                </div>
                <div className="sp-list-item-info">
                  <span className="sp-list-item-name">{script.name}</span>
                  <span className="sp-list-item-meta">{script.language}</span>
                </div>
                <div className="sp-list-item-actions">
                  <button onClick={(e) => { e.stopPropagation(); handleRun(script); }}>
                    <PlayIcon />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="sp-editor-area">
        {selected ? (
          isEditing ? (
            <ScriptEditor
              script={selected}
              environments={environments}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <ScriptPreview
              script={selected}
              environments={environments}
              onEdit={() => setIsEditing(true)}
              onDelete={() => { onDelete(selected.id); setSelected(null); }}
              onRun={() => handleRun(selected)}
            />
          )
        ) : (
          <div className="sp-editor-empty">
            <CodeIcon />
            <p>Select a script or create a new one</p>
          </div>
        )}
      </div>

      {/* Run environment selector modal */}
      {runEnv && (
        <div className="sp-modal-overlay" onClick={() => setRunEnv(null)}>
          <div className="sp-modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Select Environment</h3>
            <div className="sp-env-selector">
              {environments.map((env) => (
                <button
                  key={env.id}
                  className="sp-env-option"
                  style={{ borderColor: env.color }}
                  onClick={() => {
                    onRun(runEnv, env.id);
                    setRunEnv(null);
                  }}
                >
                  <span className="sp-env-dot" style={{ background: env.color }} />
                  {env.name}
                </button>
              ))}
            </div>
            <button className="sp-btn-cancel" onClick={() => setRunEnv(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Script Editor Component
interface ScriptEditorProps {
  script: Script;
  environments: Environment[];
  onSave: (script: Script) => void;
  onCancel: () => void;
}

function ScriptEditor({ script, environments, onSave, onCancel }: ScriptEditorProps) {
  const [form, setForm] = useState(script);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const languages: { value: ScriptLanguage; label: string }[] = [
    { value: "bash", label: "Bash" },
    { value: "powershell", label: "PowerShell" },
    { value: "batch", label: "Batch" },
    { value: "python", label: "Python" },
    { value: "node", label: "Node.js" },
  ];

  const toggleEnv = (envId: string) => {
    setForm((prev) => ({
      ...prev,
      environments: prev.environments.includes(envId)
        ? prev.environments.filter((e) => e !== envId)
        : [...prev.environments, envId],
    }));
  };

  return (
    <div className="sp-editor">
      <div className="sp-editor-header">
        <input
          type="text"
          className="sp-editor-title"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Script name"
        />
        <select
          className="sp-editor-lang"
          value={form.language}
          onChange={(e) => setForm((p) => ({ ...p, language: e.target.value as ScriptLanguage }))}
        >
          {languages.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      <textarea
        ref={textareaRef}
        className="sp-editor-code"
        value={form.content}
        onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
        placeholder="Enter your script..."
        spellCheck={false}
      />

      <div className="sp-editor-envs">
        <label>Environments:</label>
        <div className="sp-editor-env-list">
          {environments.map((env) => (
            <button
              key={env.id}
              className={`sp-env-chip ${form.environments.includes(env.id) ? "active" : ""}`}
              style={{ "--env-color": env.color } as React.CSSProperties}
              onClick={() => toggleEnv(env.id)}
            >
              <span className="sp-env-dot" style={{ background: env.color }} />
              {env.name}
            </button>
          ))}
          {environments.length === 0 && (
            <span className="sp-editor-hint">No environments configured</span>
          )}
        </div>
      </div>

      <div className="sp-editor-actions">
        <button className="sp-btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="sp-btn-save" onClick={() => onSave(form)}>Save</button>
      </div>
    </div>
  );
}

// Script Preview Component
interface ScriptPreviewProps {
  script: Script;
  environments: Environment[];
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
}

function ScriptPreview({ script, environments, onEdit, onDelete, onRun }: ScriptPreviewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="sp-preview">
      <div className="sp-preview-header">
        <div className="sp-preview-title">
          <LangIcon lang={script.language} />
          <h3>{script.name}</h3>
        </div>
        <div className="sp-preview-actions">
          <button className="sp-btn-run" onClick={onRun}>
            <PlayIcon /> Run
          </button>
          <button className="sp-btn-edit" onClick={onEdit}>
            <EditIcon /> Edit
          </button>
          <button
            className={`sp-btn-delete ${confirmDelete ? "confirm" : ""}`}
            onClick={() => {
              if (confirmDelete) onDelete();
              else setConfirmDelete(true);
            }}
            onBlur={() => setConfirmDelete(false)}
          >
            <TrashIcon /> {confirmDelete ? "Confirm" : "Delete"}
          </button>
        </div>
      </div>

      <pre className="sp-preview-code">{script.content}</pre>

      <div className="sp-preview-meta">
        <div className="sp-preview-envs">
          <span>Environments:</span>
          {script.environments.length > 0 ? (
            script.environments.map((envId) => {
              const env = environments.find((e) => e.id === envId);
              return env ? (
                <span key={envId} className="sp-env-badge" style={{ background: env.color }}>
                  {env.name}
                </span>
              ) : null;
            })
          ) : (
            <span className="sp-preview-hint">All environments</span>
          )}
        </div>
        <div className="sp-preview-dates">
          <span>Updated: {new Date(script.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

// ===== ENVIRONMENTS TAB =====

interface EnvironmentsTabProps {
  environments: Environment[];
  onSave: (env: Environment) => void;
  onDelete: (id: string) => void;
}

function EnvironmentsTab({ environments, onSave, onDelete }: EnvironmentsTabProps) {
  const [selected, setSelected] = useState<Environment | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const createNew = () => {
    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: "New Environment",
      variables: {},
      color: colors[environments.length % colors.length],
    };
    setSelected(newEnv);
    setIsEditing(true);
  };

  return (
    <div className="sp-envs">
      <div className="sp-envs-header">
        <h3>Environments</h3>
        <button className="sp-btn-add" onClick={createNew}>
          <PlusIcon /> Add
        </button>
      </div>

      <div className="sp-envs-grid">
        {environments.length === 0 ? (
          <div className="sp-empty-wide">
            <EnvIcon />
            <p>No environments configured</p>
            <span>Create environments like Development, Staging, Production</span>
            <button className="sp-btn-sm" onClick={createNew}>
              Create Environment
            </button>
          </div>
        ) : (
          environments.map((env) => (
            <div
              key={env.id}
              className={`sp-env-card ${selected?.id === env.id ? "active" : ""}`}
              style={{ borderTopColor: env.color }}
              onClick={() => { setSelected(env); setIsEditing(false); }}
            >
              <div className="sp-env-card-header">
                <span className="sp-env-dot-lg" style={{ background: env.color }} />
                <span className="sp-env-card-name">{env.name}</span>
              </div>
              <div className="sp-env-card-vars">
                {Object.keys(env.variables).length} variables
              </div>
              <div className="sp-env-card-actions">
                <button onClick={(e) => { e.stopPropagation(); setSelected(env); setIsEditing(true); }}>
                  <EditIcon />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(env.id); }}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor modal */}
      {isEditing && selected && (
        <EnvironmentEditor
          environment={selected}
          colors={colors}
          onSave={(env) => { onSave(env); setIsEditing(false); setSelected(env); }}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}

interface EnvironmentEditorProps {
  environment: Environment;
  colors: string[];
  onSave: (env: Environment) => void;
  onCancel: () => void;
}

function EnvironmentEditor({ environment, colors, onSave, onCancel }: EnvironmentEditorProps) {
  const [form, setForm] = useState(environment);
  const [varsText, setVarsText] = useState(
    Object.entries(environment.variables)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n")
  );

  const handleSave = () => {
    const variables: Record<string, string> = {};
    varsText.split("\n").forEach((line) => {
      const [key, ...vals] = line.split("=");
      if (key?.trim() && vals.length > 0) {
        variables[key.trim()] = vals.join("=").trim();
      }
    });
    onSave({ ...form, variables });
  };

  return (
    <div className="sp-modal-overlay" onClick={onCancel}>
      <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{environment.id.startsWith("env-") ? "New" : "Edit"} Environment</h3>

        <div className="sp-form-field">
          <label>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Environment name"
          />
        </div>

        <div className="sp-form-field">
          <label>Color</label>
          <div className="sp-color-picker">
            {colors.map((c) => (
              <button
                key={c}
                className={`sp-color-opt ${form.color === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setForm((p) => ({ ...p, color: c }))}
              />
            ))}
          </div>
        </div>

        <div className="sp-form-field">
          <label>Environment Variables</label>
          <textarea
            value={varsText}
            onChange={(e) => setVarsText(e.target.value)}
            placeholder="KEY=value&#10;ANOTHER_KEY=another_value"
            rows={6}
          />
        </div>

        <div className="sp-modal-actions">
          <button className="sp-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="sp-btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ===== SCHEDULES TAB =====

interface SchedulesTabProps {
  schedules: Schedule[];
  scripts: Script[];
  environments: Environment[];
  onSave: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
}

function SchedulesTab({ schedules, scripts, environments, onSave, onDelete }: SchedulesTabProps) {
  const [isCreating, setIsCreating] = useState(false);

  const createNew = () => {
    setIsCreating(true);
  };

  const commonCrons = [
    { label: "Every minute", value: "* * * * *" },
    { label: "Every 5 minutes", value: "*/5 * * * *" },
    { label: "Every hour", value: "0 * * * *" },
    { label: "Every day at midnight", value: "0 0 * * *" },
    { label: "Every Monday at 9am", value: "0 9 * * 1" },
  ];

  return (
    <div className="sp-schedules">
      <div className="sp-schedules-header">
        <h3>Scheduled Tasks</h3>
        <button className="sp-btn-add" onClick={createNew} disabled={scripts.length === 0}>
          <PlusIcon /> Add
        </button>
      </div>

      {scripts.length === 0 ? (
        <div className="sp-empty-wide">
          <ClockIcon />
          <p>Create scripts first</p>
          <span>You need scripts to schedule</span>
        </div>
      ) : schedules.length === 0 ? (
        <div className="sp-empty-wide">
          <ClockIcon />
          <p>No schedules configured</p>
          <span>Schedule scripts to run automatically</span>
          <button className="sp-btn-sm" onClick={createNew}>
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="sp-schedules-list">
          {schedules.map((schedule) => {
            const script = scripts.find((s) => s.id === schedule.script_id);
            const env = environments.find((e) => e.id === schedule.environment_id);
            return (
              <div key={schedule.id} className={`sp-schedule-card ${schedule.enabled ? "" : "disabled"}`}>
                <div className="sp-schedule-toggle">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={(e) => onSave({ ...schedule, enabled: e.target.checked })}
                  />
                </div>
                <div className="sp-schedule-info">
                  <div className="sp-schedule-name">{schedule.name}</div>
                  <div className="sp-schedule-meta">
                    <span>{script?.name || "Unknown script"}</span>
                    {env && (
                      <span className="sp-env-badge-sm" style={{ background: env.color }}>
                        {env.name}
                      </span>
                    )}
                  </div>
                  <div className="sp-schedule-cron">
                    {schedule.cron || (schedule.once_at && `Once: ${new Date(schedule.once_at).toLocaleString()}`)}
                  </div>
                </div>
                <div className="sp-schedule-actions">
                  <button onClick={() => onDelete(schedule.id)}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {isCreating && (
        <ScheduleEditor
          scripts={scripts}
          environments={environments}
          commonCrons={commonCrons}
          onSave={(schedule) => { onSave(schedule); setIsCreating(false); }}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  );
}

interface ScheduleEditorProps {
  scripts: Script[];
  environments: Environment[];
  commonCrons: { label: string; value: string }[];
  onSave: (schedule: Schedule) => void;
  onCancel: () => void;
}

function ScheduleEditor({ scripts, environments, commonCrons, onSave, onCancel }: ScheduleEditorProps) {
  const [form, setForm] = useState<Partial<Schedule>>({
    id: `schedule-${Date.now()}`,
    name: "",
    script_id: scripts[0]?.id || "",
    environment_id: environments[0]?.id || "",
    cron: "0 * * * *",
    enabled: true,
  });
  const [scheduleType, setScheduleType] = useState<"cron" | "once">("cron");

  const handleSave = () => {
    if (!form.name || !form.script_id || !form.environment_id) return;
    onSave({
      id: form.id!,
      name: form.name,
      script_id: form.script_id,
      environment_id: form.environment_id,
      cron: scheduleType === "cron" ? form.cron : undefined,
      once_at: scheduleType === "once" ? form.once_at : undefined,
      enabled: form.enabled ?? true,
    });
  };

  return (
    <div className="sp-modal-overlay" onClick={onCancel}>
      <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
        <h3>New Schedule</h3>

        <div className="sp-form-field">
          <label>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Daily backup, Weekly report..."
          />
        </div>

        <div className="sp-form-row">
          <div className="sp-form-field">
            <label>Script</label>
            <select
              value={form.script_id}
              onChange={(e) => setForm((p) => ({ ...p, script_id: e.target.value }))}
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="sp-form-field">
            <label>Environment</label>
            <select
              value={form.environment_id}
              onChange={(e) => setForm((p) => ({ ...p, environment_id: e.target.value }))}
            >
              {environments.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="sp-form-field">
          <label>Schedule Type</label>
          <div className="sp-radio-group">
            <label>
              <input
                type="radio"
                checked={scheduleType === "cron"}
                onChange={() => setScheduleType("cron")}
              />
              Recurring (Cron)
            </label>
            <label>
              <input
                type="radio"
                checked={scheduleType === "once"}
                onChange={() => setScheduleType("once")}
              />
              One-time
            </label>
          </div>
        </div>

        {scheduleType === "cron" ? (
          <div className="sp-form-field">
            <label>Cron Expression</label>
            <input
              type="text"
              value={form.cron}
              onChange={(e) => setForm((p) => ({ ...p, cron: e.target.value }))}
              placeholder="* * * * *"
            />
            <div className="sp-cron-presets">
              {commonCrons.map((c) => (
                <button
                  key={c.value}
                  className="sp-cron-preset"
                  onClick={() => setForm((p) => ({ ...p, cron: c.value }))}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="sp-form-field">
            <label>Run at</label>
            <input
              type="datetime-local"
              value={form.once_at?.slice(0, 16) || ""}
              onChange={(e) => setForm((p) => ({ ...p, once_at: new Date(e.target.value).toISOString() }))}
            />
          </div>
        )}

        <div className="sp-modal-actions">
          <button className="sp-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="sp-btn-save" onClick={handleSave}>Create</button>
        </div>
      </div>
    </div>
  );
}

// ===== TERMINAL TAB =====

interface TerminalTabProps {
  terminals: TerminalSession[];
  activeTerminal: string | null;
  onSelectTerminal: (id: string) => void;
  onCloseTerminal: (id: string) => void;
  onNewTerminal: () => void;
  onStopTerminal: (id: string) => void;
}

function TerminalTab({
  terminals,
  activeTerminal,
  onSelectTerminal,
  onCloseTerminal,
  onNewTerminal,
  onStopTerminal,
}: TerminalTabProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const current = terminals.find((t) => t.id === activeTerminal);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [current?.output]);

  return (
    <div className="sp-terminal">
      {/* Terminal tabs */}
      <div className="sp-terminal-tabs">
        {terminals.map((term) => (
          <div
            key={term.id}
            className={`sp-terminal-tab ${activeTerminal === term.id ? "active" : ""}`}
            onClick={() => onSelectTerminal(term.id)}
          >
            <span className={`sp-terminal-status ${term.status}`} />
            <span className="sp-terminal-tab-name">{term.name}</span>
            <button
              className="sp-terminal-tab-close"
              onClick={(e) => { e.stopPropagation(); onCloseTerminal(term.id); }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="sp-terminal-new" onClick={onNewTerminal}>
          <PlusIcon />
        </button>
      </div>

      {/* Terminal output */}
      {current ? (
        <div className="sp-terminal-content">
          <div className="sp-terminal-output" ref={outputRef}>
            {current.output.length === 0 ? (
              <div className="sp-terminal-empty">
                <span>Terminal ready</span>
                {current.status === "idle" && <span>Run a script to see output here</span>}
              </div>
            ) : (
              current.output.map((line, i) => (
                <div key={i} className="sp-terminal-line">{line}</div>
              ))
            )}
          </div>
          <div className="sp-terminal-footer">
            <span className={`sp-terminal-status-badge ${current.status}`}>
              {current.status}
            </span>
            {current.started_at && (
              <span className="sp-terminal-time">
                Started: {new Date(current.started_at).toLocaleTimeString()}
              </span>
            )}
            {current.status === "running" && (
              <button
                className="sp-btn-stop"
                onClick={() => onStopTerminal(current.id)}
              >
                <StopIcon /> Stop
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="sp-terminal-empty-state">
          <TerminalIcon />
          <p>No terminal sessions</p>
          <button className="sp-btn-sm" onClick={onNewTerminal}>
            New Terminal
          </button>
        </div>
      )}
    </div>
  );
}

// ===== ICONS =====

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function EnvIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v18M3 12h18" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function LangIcon({ lang }: { lang: ScriptLanguage }) {
  const colors: Record<ScriptLanguage, string> = {
    bash: "#4EAA25",
    powershell: "#012456",
    batch: "#C1F12E",
    python: "#3776AB",
    node: "#339933",
  };
  return (
    <span className="sp-lang-icon" style={{ background: colors[lang] }}>
      {lang[0].toUpperCase()}
    </span>
  );
}
