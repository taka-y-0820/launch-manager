import type { ProcessInfo, Workflow, Script } from "../types";

export type ViewType = "dashboard" | "processes" | "workflows" | "scripts" | "config";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  processes: ProcessInfo[];
  workflows: Workflow[];
  scripts?: Script[];
}

export function Sidebar({
  currentView,
  onViewChange,
  processes,
  workflows,
  scripts = [],
}: SidebarProps) {
  const runningCount = processes.filter((p) => p.status === "Running").length;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <RocketIcon />
          </div>
          <span className="sidebar-logo-text">Launch Manager</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Overview</div>
          <div
            className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}
            onClick={() => onViewChange("dashboard")}
          >
            <span className="nav-item-icon">
              <DashboardIcon />
            </span>
            Dashboard
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Management</div>
          <div
            className={`nav-item ${currentView === "processes" ? "active" : ""}`}
            onClick={() => onViewChange("processes")}
          >
            <span className="nav-item-icon">
              <ProcessIcon />
            </span>
            Processes
            {runningCount > 0 && (
              <span className="nav-item-badge">{runningCount}</span>
            )}
          </div>
          <div
            className={`nav-item ${currentView === "workflows" ? "active" : ""}`}
            onClick={() => onViewChange("workflows")}
          >
            <span className="nav-item-icon">
              <WorkflowIcon />
            </span>
            Workflows
            {workflows.length > 0 && (
              <span
                className="nav-item-badge"
                style={{ background: "var(--accent-secondary)" }}
              >
                {workflows.length}
              </span>
            )}
          </div>
          <div
            className={`nav-item ${currentView === "scripts" ? "active" : ""}`}
            onClick={() => onViewChange("scripts")}
          >
            <span className="nav-item-icon">
              <ScriptsIcon />
            </span>
            Scripts
            {scripts.length > 0 && (
              <span
                className="nav-item-badge"
                style={{ background: "var(--purple)" }}
              >
                {scripts.length}
              </span>
            )}
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Settings</div>
          <div
            className={`nav-item ${currentView === "config" ? "active" : ""}`}
            onClick={() => onViewChange("config")}
          >
            <span className="nav-item-icon">
              <ConfigIcon />
            </span>
            Configuration
          </div>
        </div>
      </nav>

      <div
        style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--status-running)",
              boxShadow: "0 0 8px var(--status-running-glow)",
            }}
          />
          System Online
        </div>
        <div style={{ marginTop: "0.25rem", opacity: 0.7 }}>v0.1.0</div>
      </div>
    </aside>
  );
}

// Icon components
function RocketIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function ProcessIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

function ConfigIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ScriptsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
