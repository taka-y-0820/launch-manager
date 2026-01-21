import { useState } from "react";
import type { AppConfig, AppDefinition } from "../types";
import { AddAppModal } from "./AddAppModal";

interface ConfigPanelProps {
  config: AppConfig | null;
  onLoadSample: () => void;
  onAddApp: (app: AppDefinition) => void;
  onDeleteApp: (appId: string) => void;
}

export function ConfigPanel({
  config,
  onLoadSample,
  onAddApp,
  onDeleteApp,
}: ConfigPanelProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDeleteApp = (appId: string) => {
    if (deleteConfirm === appId) {
      onDeleteApp(appId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(appId);
      // Auto-reset after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div>
      <div className="section-header">
        <button
          className="btn btn-primary ml-auto mb-2"
          onClick={() => setIsAddModalOpen(true)}
        >
          <PlusIcon />
          アプリを追加
        </button>
      </div>

      <div className="config-panel">
        <div className="config-panel-header">
          <span className="config-panel-title">Quick Actions</span>
        </div>
        <div className="config-panel-body">
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={onLoadSample}>
              <DownloadIcon />
              サンプル設定をロード
            </button>
          </div>
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
            }}
          >
            サンプル設定をロードして、一般的な開発ツールとワークフローを試すことができます。
          </p>
        </div>
      </div>

      {config && (
        <div className="config-panel" style={{ marginTop: "1rem" }}>
          <div className="config-panel-header">
            <span className="config-panel-title">Current Configuration</span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              v{config.version}
            </span>
          </div>
          <div className="config-panel-body">
            {/* Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "1rem",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {config.apps.length}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  Applications
                </div>
              </div>
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "1rem",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {config.workflows.length}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  Workflows
                </div>
              </div>
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "1rem",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {config.apps.filter((a) => a.auto_restart).length}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  Auto-restart
                </div>
              </div>
            </div>

            {/* Applications List */}
            <div
              style={{
                fontSize: "0.8125rem",
                fontWeight: "600",
                color: "var(--text-primary)",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Registered Applications</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setIsAddModalOpen(true)}
              >
                <PlusIcon />
                追加
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {config.apps.length === 0 ? (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    background: "var(--bg-primary)",
                    borderRadius: "8px",
                    border: "1px dashed var(--border-default)",
                  }}
                >
                  <p
                    style={{ color: "var(--text-muted)", marginBottom: "1rem" }}
                  >
                    アプリケーションが登録されていません
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <PlusIcon />
                    最初のアプリを追加
                  </button>
                </div>
              ) : (
                config.apps.map((app) => (
                  <div
                    key={app.id}
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "var(--text-primary)",
                          marginBottom: "0.125rem",
                        }}
                      >
                        {app.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "'JetBrains Mono', monospace",
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {app.command} {app.args.join(" ")}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        marginLeft: "1rem",
                      }}
                    >
                      {app.auto_restart && (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "4px",
                            background: "rgba(34, 197, 94, 0.15)",
                            color: "var(--status-running)",
                            fontWeight: "500",
                          }}
                        >
                          Auto
                        </span>
                      )}
                      {app.dependencies.length > 0 && (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "4px",
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "var(--accent-primary)",
                            fontWeight: "500",
                          }}
                        >
                          {app.dependencies.length} deps
                        </span>
                      )}
                      <button
                        className={`btn btn-sm ${deleteConfirm === app.id ? "btn-danger" : "btn-ghost"}`}
                        onClick={() => handleDeleteApp(app.id)}
                        title={
                          deleteConfirm === app.id
                            ? "もう一度クリックで削除"
                            : "削除"
                        }
                      >
                        <TrashIcon />
                        {deleteConfirm === app.id && "確認"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Raw JSON */}
            <div
              style={{
                fontSize: "0.8125rem",
                fontWeight: "600",
                color: "var(--text-primary)",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              Raw Configuration
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(config, null, 2),
                  );
                }}
              >
                <CopyIcon />
                Copy
              </button>
            </div>
            <pre className="config-code">{JSON.stringify(config, null, 2)}</pre>
          </div>
        </div>
      )}

      {!config && (
        <div className="empty-state" style={{ marginTop: "1rem" }}>
          <div className="empty-state-icon">
            <ConfigIcon />
          </div>
          <h3 className="empty-state-title">No Configuration Loaded</h3>
          <p className="empty-state-description">
            サンプル設定をロードするか、新しいアプリケーションを追加して開始してください。
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            <button className="btn btn-secondary" onClick={onLoadSample}>
              サンプルをロード
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setIsAddModalOpen(true)}
            >
              <PlusIcon />
              アプリを追加
            </button>
          </div>
        </div>
      )}

      {/* Add App Modal */}
      <AddAppModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={onAddApp}
        existingApps={config?.apps.map((a) => a.id) || []}
      />
    </div>
  );
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

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CopyIcon() {
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

function ConfigIcon() {
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
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
