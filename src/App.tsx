import { useState, useEffect } from "react";
import { api } from "./api";
import type { ProcessInfo, AppConfig } from "./types";
import "./App.css";

function App() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [selectedTab, setSelectedTab] = useState<"processes" | "config">(
    "processes"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(() => {
      refreshProcesses();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const cfg = await api.loadConfig();
      setConfig(cfg);

      // 設定からアプリを登録
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

  const handleStart = async (appId: string) => {
    try {
      setError(null);
      await api.startWithDependencies(appId);
      await refreshProcesses();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleStop = async (appId: string) => {
    try {
      setError(null);
      await api.stopProcess(appId);
      await refreshProcesses();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleRestart = async (appId: string) => {
    try {
      setError(null);
      await api.restartProcess(appId);
      await refreshProcesses();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleStopAll = async () => {
    try {
      setError(null);
      await api.stopAll();
      await refreshProcesses();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleStartWorkflow = async (workflowId: string) => {
    try {
      setError(null);
      const workflow = config?.workflows.find((w) => w.id === workflowId);
      if (workflow) {
        await api.startWorkflow(workflow);
        await refreshProcesses();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleLoadSample = async () => {
    try {
      setError(null);
      const sampleConfig = await api.getSampleConfig();
      setConfig(sampleConfig);
      await api.saveConfig(sampleConfig);

      // 再登録
      for (const app of sampleConfig.apps) {
        await api.registerApp(app);
      }

      await refreshProcesses();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const getStatusColor = (status: ProcessInfo["status"]) => {
    switch (status) {
      case "Running":
        return "#4ade80";
      case "Stopped":
        return "#94a3b8";
      case "Starting":
        return "#fbbf24";
      case "Stopping":
        return "#fb923c";
      case "Failed":
        return "#ef4444";
      case "Restarting":
        return "#fbbf24";
      default:
        return "#94a3b8";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 border-b border-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            Launch Manager
          </h1>
          <div className="flex gap-2">
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                selectedTab === "processes"
                  ? "bg-white text-blue-700 shadow-md"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setSelectedTab("processes")}
            >
              プロセス管理
            </button>
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                selectedTab === "config"
                  ? "bg-white text-blue-700 shadow-md"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setSelectedTab("config")}
            >
              設定
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex justify-between items-center">
          <span className="text-sm text-red-800">⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-lg px-2"
          >
            ✕
          </button>
        </div>
      )}

      {selectedTab === "processes" && (
        <main className="max-w-7xl mx-auto px-6 py-8">
          <section>
            {loading ? (
              <div className="text-center py-12 text-gray-600">
                読み込み中...
              </div>
            ) : processes.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-600 mb-6">
                  登録されたアプリケーションがありません
                </p>
                <button onClick={handleLoadSample} className="btn-primary">
                  サンプル設定をロード
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        名前
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        PID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        CPU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        メモリ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        再起動
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {processes.map((proc) => (
                      <tr
                        key={proc.app_id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {proc.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: getStatusColor(proc.status),
                            }}
                          >
                            {proc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {proc.pid || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {proc.pid ? `${proc.cpu_usage.toFixed(1)}%` : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {proc.pid ? formatBytes(proc.memory_usage) : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {proc.restart_count > 0
                            ? `${proc.restart_count}回`
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {proc.status === "Running" ? (
                              <>
                                <button
                                  onClick={() => handleStop(proc.app_id)}
                                  className="btn-danger btn-sm"
                                >
                                  停止
                                </button>
                                <button
                                  onClick={() => handleRestart(proc.app_id)}
                                  className="btn-secondary btn-sm"
                                >
                                  再起動
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleStart(proc.app_id)}
                                className="btn-primary btn-sm"
                                disabled={
                                  proc.status === "Starting" ||
                                  proc.status === "Stopping"
                                }
                              >
                                起動
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      )}

      {selectedTab === "config" && (
        <main className="max-w-7xl mx-auto px-6 py-8">
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              設定管理
            </h2>
            <div className="mb-6">
              <button onClick={handleLoadSample} className="btn-primary">
                サンプル設定をロード
              </button>
            </div>

            {config && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  現在の設定
                </h3>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-xs text-gray-900 leading-relaxed">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
