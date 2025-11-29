use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use sysinfo::{Pid, System};

/// アプリケーション定義
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppDefinition {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub working_dir: Option<String>,
    pub env: HashMap<String, String>,
    pub dependencies: Vec<String>,
    pub auto_restart: bool,
    pub health_check: Option<HealthCheckConfig>,
}

/// ヘルスチェック設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckConfig {
    pub interval_seconds: u64,
    pub timeout_seconds: u64,
    pub check_type: HealthCheckType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum HealthCheckType {
    Process,
    HttpGet { url: String },
    TcpPort { port: u16 },
}

/// プロセス状態
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessStatus {
    Stopped,
    Starting,
    Running,
    Stopping,
    Failed,
    Restarting,
}

/// プロセス情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub app_id: String,
    pub name: String,
    pub status: ProcessStatus,
    pub pid: Option<u32>,
    pub started_at: Option<DateTime<Utc>>,
    pub stopped_at: Option<DateTime<Utc>>,
    pub restart_count: u32,
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub error_message: Option<String>,
}

/// 管理中のプロセス
struct ManagedProcess {
    definition: AppDefinition,
    child: Option<Child>,
    info: ProcessInfo,
}

/// プロセスマネージャー
pub struct ProcessManager {
    processes: Arc<Mutex<HashMap<String, ManagedProcess>>>,
    system: Arc<Mutex<System>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
            system: Arc::new(Mutex::new(System::new_all())),
        }
    }

    /// アプリケーションを登録
    pub fn register_app(&self, definition: AppDefinition) -> Result<()> {
        let mut processes = self.processes.lock().unwrap();

        let info = ProcessInfo {
            app_id: definition.id.clone(),
            name: definition.name.clone(),
            status: ProcessStatus::Stopped,
            pid: None,
            started_at: None,
            stopped_at: None,
            restart_count: 0,
            cpu_usage: 0.0,
            memory_usage: 0,
            error_message: None,
        };

        processes.insert(
            definition.id.clone(),
            ManagedProcess {
                definition,
                child: None,
                info,
            },
        );

        Ok(())
    }

    /// プロセスを起動
    pub fn start_process(&self, app_id: &str) -> Result<()> {
        let mut processes = self.processes.lock().unwrap();

        let process = processes
            .get_mut(app_id)
            .context(format!("App not found: {}", app_id))?;

        if process.info.status == ProcessStatus::Running {
            return Ok(());
        }

        process.info.status = ProcessStatus::Starting;

        let mut cmd = Command::new(&process.definition.command);
        cmd.args(&process.definition.args);

        if let Some(working_dir) = &process.definition.working_dir {
            cmd.current_dir(working_dir);
        }

        for (key, value) in &process.definition.env {
            cmd.env(key, value);
        }

        cmd.stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .stdin(Stdio::null());

        match cmd.spawn() {
            Ok(child) => {
                let pid = child.id();
                process.child = Some(child);
                process.info.pid = Some(pid);
                process.info.status = ProcessStatus::Running;
                process.info.started_at = Some(Utc::now());
                process.info.error_message = None;

                log::info!("Started process: {} (PID: {})", app_id, pid);
                Ok(())
            }
            Err(e) => {
                process.info.status = ProcessStatus::Failed;
                process.info.error_message = Some(e.to_string());
                Err(anyhow::anyhow!("Failed to start process: {}", e))
            }
        }
    }

    /// プロセスを停止
    pub fn stop_process(&self, app_id: &str) -> Result<()> {
        let mut processes = self.processes.lock().unwrap();

        let process = processes
            .get_mut(app_id)
            .context(format!("App not found: {}", app_id))?;

        if process.info.status != ProcessStatus::Running {
            return Ok(());
        }

        process.info.status = ProcessStatus::Stopping;

        if let Some(mut child) = process.child.take() {
            match child.kill() {
                Ok(_) => {
                    let _ = child.wait();
                    process.info.status = ProcessStatus::Stopped;
                    process.info.stopped_at = Some(Utc::now());
                    process.info.pid = None;
                    log::info!("Stopped process: {}", app_id);
                    Ok(())
                }
                Err(e) => {
                    process.info.status = ProcessStatus::Failed;
                    process.info.error_message = Some(e.to_string());
                    Err(anyhow::anyhow!("Failed to stop process: {}", e))
                }
            }
        } else {
            process.info.status = ProcessStatus::Stopped;
            Ok(())
        }
    }

    /// プロセスを再起動
    pub fn restart_process(&self, app_id: &str) -> Result<()> {
        self.stop_process(app_id)?;
        std::thread::sleep(std::time::Duration::from_millis(500));

        {
            let mut processes = self.processes.lock().unwrap();
            if let Some(process) = processes.get_mut(app_id) {
                process.info.restart_count += 1;
            }
        }

        self.start_process(app_id)?;
        Ok(())
    }

    /// 全プロセス情報を取得
    pub fn get_all_processes(&self) -> Vec<ProcessInfo> {
        let processes = self.processes.lock().unwrap();
        processes.values().map(|p| p.info.clone()).collect()
    }

    /// 特定のプロセス情報を取得
    pub fn get_process(&self, app_id: &str) -> Option<ProcessInfo> {
        let processes = self.processes.lock().unwrap();
        processes.get(app_id).map(|p| p.info.clone())
    }

    /// システムリソース情報を更新
    pub fn update_system_info(&self) {
        let mut system = self.system.lock().unwrap();
        system.refresh_all();

        let mut processes = self.processes.lock().unwrap();

        for process in processes.values_mut() {
            if let Some(pid) = process.info.pid {
                if let Some(proc) = system.process(Pid::from_u32(pid)) {
                    process.info.cpu_usage = proc.cpu_usage();
                    process.info.memory_usage = proc.memory();
                } else {
                    // プロセスが存在しない場合
                    if process.info.status == ProcessStatus::Running {
                        process.info.status = ProcessStatus::Failed;
                        process.info.error_message =
                            Some("Process terminated unexpectedly".to_string());
                        process.child = None;
                    }
                }
            }
        }
    }

    /// 依存関係を考慮してアプリを起動
    pub fn start_with_dependencies(&self, app_id: &str) -> Result<()> {
        let dependencies = {
            let processes = self.processes.lock().unwrap();
            processes
                .get(app_id)
                .map(|p| p.definition.dependencies.clone())
                .unwrap_or_default()
        };

        // 依存アプリを先に起動
        for dep_id in dependencies {
            if let Some(info) = self.get_process(&dep_id) {
                if info.status != ProcessStatus::Running {
                    self.start_with_dependencies(&dep_id)?;
                    // 起動待機
                    std::thread::sleep(std::time::Duration::from_millis(1000));
                }
            }
        }

        // 自身を起動
        self.start_process(app_id)?;
        Ok(())
    }

    /// 全プロセスを停止
    pub fn stop_all(&self) -> Result<()> {
        let app_ids: Vec<String> = {
            let processes = self.processes.lock().unwrap();
            processes.keys().cloned().collect()
        };

        for app_id in app_ids {
            let _ = self.stop_process(&app_id);
        }

        Ok(())
    }
}

impl Default for ProcessManager {
    fn default() -> Self {
        Self::new()
    }
}
