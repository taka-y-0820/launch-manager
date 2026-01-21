import { useState, useEffect, useCallback } from "react";
import { api } from "./api";
import type {
  ProcessInfo,
  AppConfig,
  AppDefinition,
  Workflow,
  Script,
  Environment,
  Schedule,
} from "./types";
import {
  Sidebar,
  Dashboard,
  ProcessList,
  WorkflowPanel,
  ConfigPanel,
  ScriptPanel,
  ToastContainer,
  useToast,
  type ViewType,
} from "./components";
import "./App.css";

function App() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toasts, toast, removeToast } = useToast();

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(() => {
      refreshProcesses();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd + number for navigation
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            setCurrentView("dashboard");
            break;
          case "2":
            e.preventDefault();
            setCurrentView("processes");
            break;
          case "3":
            e.preventDefault();
            setCurrentView("workflows");
            break;
          case "4":
            e.preventDefault();
            setCurrentView("scripts");
            break;
          case "5":
            e.preventDefault();
            setCurrentView("config");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const cfg = await api.loadConfig();
      setConfig(cfg);

      // Register apps from config
      for (const app of cfg.apps) {
        try {
          await api.registerApp(app);
        } catch (e) {
          console.error(`Failed to register app ${app.id}:`, e);
        }
      }

      await refreshProcesses();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const refreshProcesses = async () => {
    try {
      await api.updateSystemInfo();
      const procs = await api.getAllProcesses();
      setProcesses(procs);
    } catch (e) {
      console.error("Failed to refresh processes:", e);
    }
  };

  const handleStart = useCallback(async (appId: string) => {
    try {
      setError(null);
      await api.startWithDependencies(appId);
      await refreshProcesses();
      toast.success(`${appId} を起動しました`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`起動に失敗: ${msg}`);
    }
  }, [toast]);

  const handleStop = useCallback(async (appId: string) => {
    try {
      setError(null);
      await api.stopProcess(appId);
      await refreshProcesses();
      toast.success(`${appId} を停止しました`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`停止に失敗: ${msg}`);
    }
  }, [toast]);

  const handleRestart = useCallback(async (appId: string) => {
    try {
      setError(null);
      await api.restartProcess(appId);
      await refreshProcesses();
      toast.success(`${appId} を再起動しました`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`再起動に失敗: ${msg}`);
    }
  }, [toast]);

  const handleStopAll = useCallback(async () => {
    try {
      setError(null);
      await api.stopAll();
      await refreshProcesses();
      toast.success("すべてのプロセスを停止しました");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`停止に失敗: ${msg}`);
    }
  }, [toast]);

  const handleStartAll = useCallback(async () => {
    try {
      setError(null);
      const stoppedProcesses = processes.filter((p) => p.status === "Stopped");
      for (const proc of stoppedProcesses) {
        await api.startWithDependencies(proc.app_id);
      }
      await refreshProcesses();
      toast.success(`${stoppedProcesses.length}個のプロセスを起動しました`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`起動に失敗: ${msg}`);
    }
  }, [processes, toast]);

  const handleStartWorkflow = useCallback(async (workflowId: string) => {
    try {
      setError(null);
      const workflow = config?.workflows.find((w) => w.id === workflowId);
      if (workflow) {
        await api.startWorkflow(workflow);
        await refreshProcesses();
        toast.success(`ワークフロー "${workflow.name}" を開始しました`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`ワークフロー開始に失敗: ${msg}`);
    }
  }, [config, toast]);

  const handleLoadSample = useCallback(async () => {
    try {
      setError(null);
      const sampleConfig = await api.getSampleConfig();
      setConfig(sampleConfig);
      await api.saveConfig(sampleConfig);

      // Re-register apps
      for (const app of sampleConfig.apps) {
        await api.registerApp(app);
      }

      await refreshProcesses();
      toast.success("サンプル設定をロードしました");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`ロードに失敗: ${msg}`);
    }
  }, [toast]);

  const handleAddApp = useCallback(async (app: AppDefinition) => {
    try {
      setError(null);

      // Register the app with the backend
      await api.registerApp(app);

      // Update config state
      const newConfig: AppConfig = config
        ? { ...config, apps: [...config.apps, app] }
        : { version: "1.0", apps: [app], workflows: [] };

      setConfig(newConfig);
      await api.saveConfig(newConfig);
      await refreshProcesses();
      toast.success(`"${app.name}" を追加しました`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`追加に失敗: ${msg}`);
    }
  }, [config, toast]);

  const handleDeleteApp = useCallback(async (appId: string) => {
    try {
      setError(null);

      // Stop the process if running
      const proc = processes.find((p) => p.app_id === appId);
      if (proc && proc.status === "Running") {
        await api.stopProcess(appId);
      }

      // Update config state
      if (config) {
        const newConfig: AppConfig = {
          ...config,
          apps: config.apps.filter((a) => a.id !== appId),
          // Also remove from workflows
          workflows: config.workflows.map((w) => ({
            ...w,
            apps: w.apps.filter((a) => a !== appId),
          })),
        };

        setConfig(newConfig);
        await api.saveConfig(newConfig);
      }

      await refreshProcesses();
      toast.success(`"${appId}" を削除しました`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`削除に失敗: ${msg}`);
    }
  }, [config, processes, toast]);

  const handleSaveWorkflow = useCallback(async (workflow: Workflow) => {
    try {
      setError(null);

      if (!config) return;

      const existingIndex = config.workflows.findIndex((w) => w.id === workflow.id);
      const newWorkflows =
        existingIndex >= 0
          ? config.workflows.map((w, i) => (i === existingIndex ? workflow : w))
          : [...config.workflows, workflow];

      const newConfig: AppConfig = {
        ...config,
        workflows: newWorkflows,
      };

      setConfig(newConfig);
      await api.saveConfig(newConfig);
      toast.success(
        existingIndex >= 0
          ? `ワークフロー "${workflow.name}" を更新しました`
          : `ワークフロー "${workflow.name}" を作成しました`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`保存に失敗: ${msg}`);
    }
  }, [config, toast]);

  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    try {
      setError(null);

      if (!config) return;

      const workflow = config.workflows.find((w) => w.id === workflowId);
      const newConfig: AppConfig = {
        ...config,
        workflows: config.workflows.filter((w) => w.id !== workflowId),
      };

      setConfig(newConfig);
      await api.saveConfig(newConfig);
      toast.success(`ワークフロー "${workflow?.name || workflowId}" を削除しました`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`削除に失敗: ${msg}`);
    }
  }, [config, toast]);

  const getViewTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Dashboard";
      case "processes":
        return "Process Management";
      case "workflows":
        return "Workflows";
      case "scripts":
        return "Scripts & Automation";
      case "config":
        return "Configuration";
      default:
        return "Launch Manager";
    }
  };

  // Script management handlers
  const handleSaveScript = useCallback(
    async (script: Script) => {
      if (!config) return;
      const scripts = config.scripts || [];
      const existingIndex = scripts.findIndex((s) => s.id === script.id);
      const newScripts =
        existingIndex >= 0
          ? scripts.map((s, i) => (i === existingIndex ? script : s))
          : [...scripts, script];
      const newConfig = { ...config, scripts: newScripts };
      setConfig(newConfig);
      await api.saveConfig(newConfig);
      toast.success(`スクリプト "${script.name}" を保存しました`);
    },
    [config, toast]
  );

  const handleDeleteScript = useCallback(
    async (scriptId: string) => {
      if (!config) return;
      const newConfig = {
        ...config,
        scripts: (config.scripts || []).filter((s) => s.id !== scriptId),
        schedules: (config.schedules || []).filter((s) => s.script_id !== scriptId),
      };
      setConfig(newConfig);
      await api.saveConfig(newConfig);
      toast.success("スクリプトを削除しました");
    },
    [config, toast]
  );

  const handleSaveEnvironment = useCallback(
    async (env: Environment) => {
      if (!config) return;
      const environments = config.environments || [];
      const existingIndex = environments.findIndex((e) => e.id === env.id);
      const newEnvs =
        existingIndex >= 0
          ? environments.map((e, i) => (i === existingIndex ? env : e))
          : [...environments, env];
      const newConfig = { ...config, environments: newEnvs };
      setConfig(newConfig);
      await api.saveConfig(newConfig);
      toast.success(`環境 "${env.name}" を保存しました`);
    },
    [config, toast]
  );

  const handleDeleteEnvironment = useCallback(
    async (envId: string) => {
      if (!config) return;
      const newConfig = {
        ...config,
        environments: (config.environments || []).filter((e) => e.id !== envId),
        schedules: (config.schedules || []).filter((s) => s.environment_id !== envId),
      };
      setConfig(newConfig);
      await api.saveConfig(newConfig);
      toast.success("環境を削除しました");
    },
    [config, toast]
  );

  const handleSaveSchedule = useCallback(
    async (schedule: Schedule) => {
      if (!config) return;
      const schedules = config.schedules || [];
      const existingIndex = schedules.findIndex((s) => s.id === schedule.id);
      const newSchedules =
        existingIndex >= 0
          ? schedules.map((s, i) => (i === existingIndex ? schedule : s))
          : [...schedules, schedule];
      const newConfig = { ...config, schedules: newSchedules };
      setConfig(newConfig);
      await api.saveConfig(newConfig);
      toast.success(`スケジュール "${schedule.name}" を保存しました`);
    },
    [config, toast]
  );

  const handleDeleteSchedule = useCallback(
    async (scheduleId: string) => {
      if (!config) return;
      const newConfig = {
        ...config,
        schedules: (config.schedules || []).filter((s) => s.id !== scheduleId),
      };
      setConfig(newConfig);
      await api.saveConfig(newConfig);
      toast.success("スケジュールを削除しました");
    },
    [config, toast]
  );

  
  const runningCount = processes.filter((p) => p.status === "Running").length;

  return (
    <div className="app-container">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        processes={processes}
        workflows={config?.workflows || []}
        scripts={config?.scripts || []}
      />

      <main className="main-content">
        <header className="main-header">
          <h1 className="main-header-title">{getViewTitle()}</h1>
          <div className="main-header-actions">
            {runningCount > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  background: "rgba(34, 197, 94, 0.1)",
                  borderRadius: "6px",
                  fontSize: "0.8125rem",
                  color: "var(--status-running)",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--status-running)",
                    boxShadow: "0 0 8px var(--status-running-glow)",
                    animation: "pulse-dot 2s ease-in-out infinite",
                  }}
                />
                {runningCount} Running
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: "0.25rem",
                marginLeft: "0.5rem",
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
              }}
            >
              <span className="kbd">Ctrl</span>
              <span>+</span>
              <span className="kbd">1-5</span>
            </div>
          </div>
        </header>

        {error && (
          <div style={{ padding: "0 1.5rem", paddingTop: "1rem" }}>
            <div className="notification error animate-fade-in">
              <AlertIcon />
              <span>{error}</span>
              <button
                className="notification-close"
                onClick={() => setError(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="main-body">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <span className="loading-text">Loading...</span>
            </div>
          ) : (
            <>
              {currentView === "dashboard" && (
                <Dashboard
                  processes={processes}
                  workflows={config?.workflows || []}
                  onStart={handleStart}
                  onStop={handleStop}
                  onRestart={handleRestart}
                  onStopAll={handleStopAll}
                  onStartAll={handleStartAll}
                  onStartWorkflow={handleStartWorkflow}
                />
              )}

              {currentView === "processes" && (
                <ProcessList
                  processes={processes}
                  apps={config?.apps}
                  onStart={handleStart}
                  onStop={handleStop}
                  onRestart={handleRestart}
                  onStopAll={handleStopAll}
                  onStartAll={handleStartAll}
                />
              )}

              {currentView === "workflows" && (
                <WorkflowPanel
                  workflows={config?.workflows || []}
                  processes={processes}
                  apps={config?.apps || []}
                  onStartWorkflow={handleStartWorkflow}
                  onSaveWorkflow={handleSaveWorkflow}
                  onDeleteWorkflow={handleDeleteWorkflow}
                />
              )}

              {currentView === "scripts" && (
                <ScriptPanel
                  scripts={config?.scripts || []}
                  environments={config?.environments || []}
                  schedules={config?.schedules || []}
                  onSaveScript={handleSaveScript}
                  onDeleteScript={handleDeleteScript}
                  onSaveEnvironment={handleSaveEnvironment}
                  onDeleteEnvironment={handleDeleteEnvironment}
                  onSaveSchedule={handleSaveSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                />
              )}

              {currentView === "config" && (
                <ConfigPanel
                  config={config}
                  onLoadSample={handleLoadSample}
                  onAddApp={handleAddApp}
                  onDeleteApp={handleDeleteApp}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// Icon component
function AlertIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default App;
