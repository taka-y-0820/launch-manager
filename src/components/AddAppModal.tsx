import { useState, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppDefinition } from "../types";

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (app: AppDefinition) => void;
  existingApps: string[];
}

const defaultForm = {
  id: "",
  name: "",
  command: "",
  args: "",
  working_dir: "",
  env: "",
  dependencies: [] as string[],
  auto_restart: false,
};

export function AddAppModal({
  isOpen,
  onClose,
  onAdd,
  existingApps,
}: AddAppModalProps) {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const commandRef = useRef<HTMLInputElement>(null);

  // Reset and focus when opened
  useEffect(() => {
    if (isOpen) {
      setForm(defaultForm);
      setError("");
      setShowAdvanced(false);
      // Small delay to allow animation to start
      setTimeout(() => commandRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, form]);

  const handleBrowse = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Executables", extensions: ["exe", "bat", "cmd", "ps1", "py", "js", "sh"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (selected && typeof selected === "string") {
        const name = getFileName(selected);
        const id = makeId(name);
        const dir = getDirectory(selected);

        setForm((prev) => ({
          ...prev,
          command: selected,
          name: prev.name || name,
          id: prev.id || (existingApps.includes(id) ? `${id}-2` : id),
          working_dir: prev.working_dir || dir,
        }));
        setError("");
      }
    } catch (e) {
      console.error("Failed to open file dialog:", e);
    }
  };

  const handleBrowseDir = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        setForm((prev) => ({ ...prev, working_dir: selected }));
      }
    } catch (e) {
      console.error("Failed to open directory dialog:", e);
    }
  };

  const getFileName = (path: string): string => {
    const parts = path.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1].replace(/\.[^.]+$/, "");
  };

  const makeId = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  };

  const getDirectory = (path: string): string => {
    const parts = path.replace(/\\/g, "/").split("/");
    parts.pop();
    return parts.join("/");
  };

  const handleSubmit = () => {
    // Validation
    if (!form.command.trim()) {
      setError("コマンドを入力またはファイルを選択してください");
      return;
    }
    if (!form.name.trim()) {
      setError("名前を入力してください");
      return;
    }
    if (!form.id.trim()) {
      setError("IDを入力してください");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.id)) {
      setError("IDは小文字英数字とハイフンのみ");
      return;
    }
    if (existingApps.includes(form.id)) {
      setError("このIDは既に使用されています");
      return;
    }

    // Parse env
    const envObj: Record<string, string> = {};
    if (form.env.trim()) {
      form.env.split("\n").forEach((line) => {
        const [key, ...vals] = line.split("=");
        if (key && vals.length > 0) {
          envObj[key.trim()] = vals.join("=").trim();
        }
      });
    }

    const app: AppDefinition = {
      id: form.id.trim(),
      name: form.name.trim(),
      command: form.command.trim(),
      args: form.args.trim() ? form.args.split(/\s+/).filter(Boolean) : [],
      working_dir: form.working_dir.trim() || undefined,
      env: envObj,
      dependencies: form.dependencies,
      auto_restart: form.auto_restart,
    };

    onAdd(app);
    onClose();
  };

  const toggleDep = (id: string) => {
    setForm((prev) => ({
      ...prev,
      dependencies: prev.dependencies.includes(id)
        ? prev.dependencies.filter((d) => d !== id)
        : [...prev.dependencies, id],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="add-modal-overlay" onClick={onClose}>
      <div className="add-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="add-modal-header">
          <h2>アプリを追加</h2>
          <button className="add-modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="add-modal-body">
          {/* Primary: Browse button */}
          <button className="add-modal-browse" onClick={handleBrowse}>
            <FolderIcon />
            <span>ファイルを選択</span>
            <span className="add-modal-browse-hint">または下に直接入力</span>
          </button>

          {/* Command */}
          <div className="add-modal-field">
            <label>コマンド / パス</label>
            <input
              ref={commandRef}
              type="text"
              placeholder="python, node, C:\path\to\script.bat"
              value={form.command}
              onChange={(e) => setForm((p) => ({ ...p, command: e.target.value }))}
            />
          </div>

          {/* Name & ID row */}
          <div className="add-modal-row">
            <div className="add-modal-field">
              <label>名前</label>
              <input
                type="text"
                placeholder="My App"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="add-modal-field add-modal-field-id">
              <label>ID</label>
              <input
                type="text"
                placeholder="my-app"
                value={form.id}
                onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
              />
            </div>
          </div>

          {/* Error message */}
          {error && <div className="add-modal-error">{error}</div>}

          {/* Advanced toggle */}
          <button
            className="add-modal-advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <ChevronIcon open={showAdvanced} />
            <span>詳細設定</span>
          </button>

          {/* Advanced section */}
          {showAdvanced && (
            <div className="add-modal-advanced">
              {/* Arguments */}
              <div className="add-modal-field">
                <label>引数</label>
                <input
                  type="text"
                  placeholder="--port 3000 --verbose"
                  value={form.args}
                  onChange={(e) => setForm((p) => ({ ...p, args: e.target.value }))}
                />
              </div>

              {/* Working Directory */}
              <div className="add-modal-field">
                <label>作業ディレクトリ</label>
                <div className="add-modal-field-with-btn">
                  <input
                    type="text"
                    placeholder="C:\projects\my-app"
                    value={form.working_dir}
                    onChange={(e) => setForm((p) => ({ ...p, working_dir: e.target.value }))}
                  />
                  <button onClick={handleBrowseDir}>
                    <FolderIcon />
                  </button>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="add-modal-field">
                <label>環境変数</label>
                <textarea
                  placeholder="NODE_ENV=development&#10;PORT=3000"
                  rows={2}
                  value={form.env}
                  onChange={(e) => setForm((p) => ({ ...p, env: e.target.value }))}
                />
              </div>

              {/* Dependencies */}
              {existingApps.length > 0 && (
                <div className="add-modal-field">
                  <label>依存関係</label>
                  <div className="add-modal-deps">
                    {existingApps.map((id) => (
                      <button
                        key={id}
                        className={`add-modal-dep ${form.dependencies.includes(id) ? "active" : ""}`}
                        onClick={() => toggleDep(id)}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-restart */}
              <label className="add-modal-checkbox">
                <input
                  type="checkbox"
                  checked={form.auto_restart}
                  onChange={(e) => setForm((p) => ({ ...p, auto_restart: e.target.checked }))}
                />
                <span>自動再起動</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="add-modal-footer">
          <span className="add-modal-hint">
            <kbd>Esc</kbd> キャンセル
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 追加
          </span>
          <div className="add-modal-actions">
            <button className="add-modal-btn-cancel" onClick={onClose}>
              キャンセル
            </button>
            <button className="add-modal-btn-submit" onClick={handleSubmit}>
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 200ms ease",
      }}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
