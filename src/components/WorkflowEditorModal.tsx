import { useState, useEffect } from "react";
import type { Workflow, AppDefinition } from "../types";

interface WorkflowEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workflow: Workflow) => void;
  existingWorkflow?: Workflow | null;
  availableApps: AppDefinition[];
}

export function WorkflowEditorModal({
  isOpen,
  onClose,
  onSave,
  existingWorkflow,
  availableApps,
}: WorkflowEditorModalProps) {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    apps: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingWorkflow) {
      setFormData({
        id: existingWorkflow.id,
        name: existingWorkflow.name,
        description: existingWorkflow.description || "",
        apps: existingWorkflow.apps,
      });
    } else {
      setFormData({
        id: "",
        name: "",
        description: "",
        apps: [],
      });
    }
  }, [existingWorkflow, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = "IDは必須です";
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = "IDは小文字英数字とハイフンのみ使用可能です";
    }

    if (!formData.name.trim()) {
      newErrors.name = "名前は必須です";
    }

    if (formData.apps.length === 0) {
      newErrors.apps = "少なくとも1つのアプリを選択してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const workflow: Workflow = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      apps: formData.apps,
    };

    onSave(workflow);
    handleClose();
  };

  const handleClose = () => {
    setFormData({ id: "", name: "", description: "", apps: [] });
    setErrors({});
    onClose();
  };

  const toggleApp = (appId: string) => {
    setFormData((prev) => ({
      ...prev,
      apps: prev.apps.includes(appId)
        ? prev.apps.filter((a) => a !== appId)
        : [...prev.apps, appId],
    }));
  };

  const moveApp = (index: number, direction: "up" | "down") => {
    const newApps = [...formData.apps];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newApps.length) return;
    [newApps[index], newApps[newIndex]] = [newApps[newIndex], newApps[index]];
    setFormData((prev) => ({ ...prev, apps: newApps }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "640px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            <WorkflowIcon />
            {existingWorkflow ? "ワークフローを編集" : "新しいワークフローを作成"}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          {/* ID */}
          <div className="form-group">
            <label className="form-label">
              ID <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.id ? "error" : ""}`}
              placeholder="full-stack"
              value={formData.id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, id: e.target.value }))
              }
              disabled={!!existingWorkflow}
            />
            {errors.id && <span className="form-error">{errors.id}</span>}
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="form-label">
              名前 <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.name ? "error" : ""}`}
              placeholder="Full Stack Development"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">説明</label>
            <textarea
              className="form-textarea"
              placeholder="このワークフローの説明..."
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          {/* App Selection */}
          <div className="form-group">
            <label className="form-label">
              アプリケーション <span className="required">*</span>
            </label>
            {errors.apps && <span className="form-error">{errors.apps}</span>}

            {availableApps.length === 0 ? (
              <div
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  background: "var(--bg-primary)",
                  borderRadius: "8px",
                  border: "1px dashed var(--border-default)",
                  color: "var(--text-muted)",
                }}
              >
                登録されたアプリケーションがありません
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                }}
              >
                {availableApps.map((app) => (
                  <label
                    key={app.id}
                    className="dependency-item"
                    style={{
                      padding: "0.625rem 0.75rem",
                      background: formData.apps.includes(app.id)
                        ? "rgba(59, 130, 246, 0.1)"
                        : "var(--bg-tertiary)",
                      borderColor: formData.apps.includes(app.id)
                        ? "var(--accent-primary)"
                        : "var(--border-subtle)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.apps.includes(app.id)}
                      onChange={() => toggleApp(app.id)}
                    />
                    <div>
                      <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                        {app.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--text-muted)",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {app.id}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected Apps Order */}
          {formData.apps.length > 0 && (
            <div className="form-group">
              <label className="form-label">起動順序</label>
              <span className="form-hint" style={{ marginTop: 0, marginBottom: "0.5rem", display: "block" }}>
                ドラッグまたは矢印ボタンで順序を変更
              </span>
              <div
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.5rem",
                }}
              >
                {formData.apps.map((appId, index) => {
                  const app = availableApps.find((a) => a.id === appId);
                  return (
                    <div
                      key={appId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.5rem 0.75rem",
                        background: "var(--bg-secondary)",
                        borderRadius: "6px",
                        marginBottom: index < formData.apps.length - 1 ? "0.375rem" : 0,
                      }}
                    >
                      <span
                        style={{
                          width: "24px",
                          height: "24px",
                          background: "var(--accent-primary)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          color: "white",
                        }}
                      >
                        {index + 1}
                      </span>
                      <span style={{ flex: 1, fontWeight: "500" }}>
                        {app?.name || appId}
                      </span>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon sm"
                          onClick={() => moveApp(index, "up")}
                          disabled={index === 0}
                          style={{ opacity: index === 0 ? 0.3 : 1 }}
                        >
                          <ChevronUpIcon />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon sm"
                          onClick={() => moveApp(index, "down")}
                          disabled={index === formData.apps.length - 1}
                          style={{ opacity: index === formData.apps.length - 1 ? 0.3 : 1 }}
                        >
                          <ChevronDownIcon />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <SaveIcon />
            {existingWorkflow ? "更新" : "作成"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Icons
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

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SaveIcon() {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function ChevronUpIcon() {
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
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDownIcon() {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
