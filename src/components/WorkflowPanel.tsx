import { useState } from "react";
import type { Workflow, ProcessInfo, AppDefinition } from "../types";
import { WorkflowEditorModal } from "./WorkflowEditorModal";

interface WorkflowPanelProps {
  workflows: Workflow[];
  processes: ProcessInfo[];
  apps: AppDefinition[];
  onStartWorkflow: (workflowId: string) => void;
  onSaveWorkflow: (workflow: Workflow) => void;
  onDeleteWorkflow: (workflowId: string) => void;
}

export function WorkflowPanel({
  workflows,
  processes,
  apps,
  onStartWorkflow,
  onSaveWorkflow,
  onDeleteWorkflow,
}: WorkflowPanelProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getAppStatus = (appId: string) => {
    const process = processes.find((p) => p.app_id === appId);
    return process?.status || "Unknown";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Running":
        return "var(--status-running)";
      case "Stopped":
        return "var(--status-stopped)";
      case "Starting":
      case "Restarting":
        return "var(--status-starting)";
      case "Failed":
        return "var(--status-failed)";
      default:
        return "var(--text-muted)";
    }
  };

  const getWorkflowStatus = (workflow: Workflow) => {
    const statuses = workflow.apps.map((appId) => getAppStatus(appId));
    const runningCount = statuses.filter((s) => s === "Running").length;
    const failedCount = statuses.filter((s) => s === "Failed").length;

    if (failedCount > 0) return "partial-failed";
    if (runningCount === workflow.apps.length) return "all-running";
    if (runningCount > 0) return "partial-running";
    return "stopped";
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingWorkflow(null);
    setIsEditorOpen(true);
  };

  const handleDelete = (workflowId: string) => {
    if (deleteConfirm === workflowId) {
      onDeleteWorkflow(workflowId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(workflowId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div>
      <div className="section-header">
        <button className="btn btn-primary ml-auto mb-2" onClick={handleCreate}>
          <PlusIcon />
          ワークフローを作成
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <WorkflowEmptyIcon />
          </div>
          <h3 className="empty-state-title">No Workflows Defined</h3>
          <p className="empty-state-description">
            ワークフローを作成すると、複数のアプリケーションを1クリックで起動できます。
          </p>
          <button className="btn btn-primary" onClick={handleCreate}>
            <PlusIcon />
            最初のワークフローを作成
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
            gap: "1rem",
          }}
        >
          {workflows.map((workflow) => {
            const workflowStatus = getWorkflowStatus(workflow);

            return (
              <div key={workflow.id} className="workflow-card">
                <div className="workflow-card-header">
                  <div className="workflow-card-title">
                    <div className="workflow-card-icon">
                      <WorkflowIcon />
                    </div>
                    {workflow.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <WorkflowStatusBadge status={workflowStatus} />
                    <div className="dropdown" style={{ position: "relative" }}>
                      <button
                        className="btn btn-ghost btn-icon sm"
                        onClick={() => handleEdit(workflow)}
                        title="編集"
                      >
                        <EditIcon />
                      </button>
                    </div>
                  </div>
                </div>

                {workflow.description && (
                  <p className="workflow-card-description">
                    {workflow.description}
                  </p>
                )}

                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.5rem",
                  }}
                >
                  Applications ({workflow.apps.length})
                </div>

                <div className="workflow-apps">
                  {workflow.apps.map((appId, index) => {
                    const status = getAppStatus(appId);
                    const process = processes.find((p) => p.app_id === appId);
                    const app = apps.find((a) => a.id === appId);
                    const name = process?.name || app?.name || appId;

                    return (
                      <div
                        key={appId}
                        className="workflow-app-tag"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.625rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            width: "14px",
                          }}
                        >
                          {index + 1}.
                        </span>
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: getStatusColor(status),
                            flexShrink: 0,
                          }}
                        />
                        {name}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onStartWorkflow(workflow.id)}
                    style={{ flex: 1 }}
                  >
                    <PlayIcon />
                    Start Workflow
                  </button>
                  <button
                    className={`btn btn-sm ${deleteConfirm === workflow.id ? "btn-danger" : "btn-ghost"}`}
                    onClick={() => handleDelete(workflow.id)}
                    title={
                      deleteConfirm === workflow.id
                        ? "もう一度クリックで削除"
                        : "削除"
                    }
                  >
                    <TrashIcon />
                    {deleteConfirm === workflow.id && "確認"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workflow Editor Modal */}
      <WorkflowEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingWorkflow(null);
        }}
        onSave={onSaveWorkflow}
        existingWorkflow={editingWorkflow}
        availableApps={apps}
      />
    </div>
  );
}

function WorkflowStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    "all-running": { label: "All Running", className: "running" },
    "partial-running": { label: "Partial", className: "starting" },
    "partial-failed": { label: "Issues", className: "failed" },
    stopped: { label: "Stopped", className: "stopped" },
  };

  const { label, className } = config[status] || config.stopped;

  return <span className={`process-status-badge ${className}`}>{label}</span>;
}

// Icon components
function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
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

function WorkflowEmptyIcon() {
  return (
    <svg
      width="28"
      height="28"
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

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
