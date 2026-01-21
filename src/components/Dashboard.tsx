import type { ProcessInfo, Workflow } from "../types";

interface DashboardProps {
  processes: ProcessInfo[];
  workflows: Workflow[];
  onStart: (appId: string) => void;
  onStop: (appId: string) => void;
  onRestart: (appId: string) => void;
  onStopAll: () => void;
  onStartAll?: () => void;
  onStartWorkflow: (workflowId: string) => void;
}

export function Dashboard({
  processes,
  workflows,
  onStart,
  onStop,
  onRestart,
  onStopAll,
  onStartAll,
  onStartWorkflow,
}: DashboardProps) {
  const running = processes.filter((p) => p.status === "Running");
  const stopped = processes.filter((p) => p.status === "Stopped");
  const failed = processes.filter((p) => p.status === "Failed");

  const totalCpu = running.reduce((acc, p) => acc + p.cpu_usage, 0);
  const totalMem = running.reduce((acc, p) => acc + p.memory_usage, 0);

  const formatMem = (bytes: number) => {
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  const formatUptime = (started?: string) => {
    if (!started) return "";
    const s = Math.floor((Date.now() - new Date(started).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  if (processes.length === 0) {
    return (
      <div className="dash-empty">
        <div className="dash-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h2>Welcome to Launch Manager</h2>
        <p>Configure applications to get started</p>
      </div>
    );
  }

  return (
    <div className="dash">
      {/* Status overview */}
      <div className="dash-status">
        <div className={`dash-stat running ${running.length > 0 ? "active" : ""}`}>
          <div className="dash-stat-value">{running.length}</div>
          <div className="dash-stat-label">Running</div>
          {running.length > 0 && <div className="dash-stat-glow" />}
        </div>
        <div className={`dash-stat stopped ${stopped.length > 0 ? "active" : ""}`}>
          <div className="dash-stat-value">{stopped.length}</div>
          <div className="dash-stat-label">Stopped</div>
        </div>
        <div className={`dash-stat failed ${failed.length > 0 ? "active" : ""}`}>
          <div className="dash-stat-value">{failed.length}</div>
          <div className="dash-stat-label">Failed</div>
          {failed.length > 0 && <div className="dash-stat-pulse" />}
        </div>
      </div>

      {/* Quick actions */}
      <div className="dash-actions">
        {stopped.length > 0 && onStartAll && (
          <button className="dash-btn start" onClick={onStartAll}>
            <PlayIcon />
            <span>Start All</span>
            <span className="dash-btn-count">{stopped.length}</span>
          </button>
        )}
        {running.length > 0 && (
          <button className="dash-btn stop" onClick={onStopAll}>
            <StopIcon />
            <span>Stop All</span>
            <span className="dash-btn-count">{running.length}</span>
          </button>
        )}
        {workflows.slice(0, 3).map((w) => (
          <button
            key={w.id}
            className="dash-btn workflow"
            onClick={() => onStartWorkflow(w.id)}
            title={w.description}
          >
            <WorkflowIcon />
            <span>{w.name}</span>
          </button>
        ))}
      </div>

      {/* Resource meters */}
      {running.length > 0 && (
        <div className="dash-meters">
          <div className="dash-meter">
            <div className="dash-meter-header">
              <CpuIcon />
              <span>CPU</span>
              <span className="dash-meter-value">{totalCpu.toFixed(1)}%</span>
            </div>
            <div className="dash-meter-bar">
              <div
                className="dash-meter-fill cpu"
                style={{ width: `${Math.min(totalCpu, 100)}%` }}
              />
            </div>
          </div>
          <div className="dash-meter">
            <div className="dash-meter-header">
              <MemIcon />
              <span>Memory</span>
              <span className="dash-meter-value">{formatMem(totalMem)}</span>
            </div>
            <div className="dash-meter-bar">
              <div
                className="dash-meter-fill mem"
                style={{ width: `${Math.min((totalMem / 4294967296) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active processes */}
      {(running.length > 0 || failed.length > 0) && (
        <div className="dash-processes">
          <div className="dash-section-title">Active</div>
          <div className="dash-process-list">
            {[...failed, ...running].slice(0, 6).map((p) => (
              <div
                key={p.app_id}
                className={`dash-process ${p.status.toLowerCase()}`}
              >
                <div className="dash-process-indicator" />
                <div className="dash-process-info">
                  <span className="dash-process-name">{p.name}</span>
                  {p.status === "Running" && (
                    <span className="dash-process-meta">
                      {formatUptime(p.started_at)} · {p.cpu_usage.toFixed(0)}%
                    </span>
                  )}
                  {p.status === "Failed" && (
                    <span className="dash-process-error">
                      {p.error_message || "Failed"}
                    </span>
                  )}
                </div>
                <div className="dash-process-actions">
                  {p.status === "Running" ? (
                    <>
                      <button onClick={() => onRestart(p.app_id)} title="Restart">
                        <RestartIcon />
                      </button>
                      <button onClick={() => onStop(p.app_id)} title="Stop">
                        <StopIcon />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => onStart(p.app_id)} title="Start">
                      <PlayIcon />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
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

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="19" r="2" />
      <path d="M6.5 10.5L10.5 6.5M13.5 6.5L17.5 10.5M17.5 13.5L13.5 17.5M10.5 17.5L6.5 13.5" />
    </svg>
  );
}

function CpuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
    </svg>
  );
}

function MemIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10v4M10 10v4M14 10v4M18 10v4" />
    </svg>
  );
}
