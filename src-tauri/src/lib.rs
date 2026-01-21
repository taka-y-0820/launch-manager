mod config;
mod process_manager;

use config::{generate_sample_config, AppConfig, Workflow};
use process_manager::{AppDefinition, ProcessInfo, ProcessManager};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

// Script execution types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptRunRequest {
    pub session_id: String,
    pub script_content: String,
    pub language: String,
    pub working_dir: Option<String>,
    pub env_vars: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScriptOutput {
    pub session_id: String,
    pub line: String,
    pub is_stderr: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScriptComplete {
    pub session_id: String,
    pub exit_code: Option<i32>,
    pub success: bool,
}

// Store running script processes
struct ScriptState {
    running_scripts: Mutex<HashMap<String, Child>>,
}

struct AppState {
    process_manager: Mutex<ProcessManager>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn register_app(state: State<AppState>, definition: AppDefinition) -> Result<(), String> {
    state
        .process_manager
        .lock()
        .unwrap()
        .register_app(definition)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn start_process(state: State<AppState>, app_id: String) -> Result<(), String> {
    state
        .process_manager
        .lock()
        .unwrap()
        .start_process(&app_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_process(state: State<AppState>, app_id: String) -> Result<(), String> {
    state
        .process_manager
        .lock()
        .unwrap()
        .stop_process(&app_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn restart_process(state: State<AppState>, app_id: String) -> Result<(), String> {
    state
        .process_manager
        .lock()
        .unwrap()
        .restart_process(&app_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_all_processes(state: State<AppState>) -> Vec<ProcessInfo> {
    state.process_manager.lock().unwrap().get_all_processes()
}

#[tauri::command]
fn get_process(state: State<AppState>, app_id: String) -> Option<ProcessInfo> {
    state.process_manager.lock().unwrap().get_process(&app_id)
}

#[tauri::command]
fn update_system_info(state: State<AppState>) {
    state.process_manager.lock().unwrap().update_system_info();
}

#[tauri::command]
fn start_with_dependencies(state: State<AppState>, app_id: String) -> Result<(), String> {
    state
        .process_manager
        .lock()
        .unwrap()
        .start_with_dependencies(&app_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_all(state: State<AppState>) -> Result<(), String> {
    state
        .process_manager
        .lock()
        .unwrap()
        .stop_all()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config() -> Result<AppConfig, String> {
    Ok(AppConfig::load_or_default())
}

#[tauri::command]
fn save_config(config: AppConfig) -> Result<(), String> {
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config_from_file(path: String) -> Result<AppConfig, String> {
    if path.ends_with(".yaml") || path.ends_with(".yml") {
        AppConfig::from_yaml(&path)
    } else {
        AppConfig::from_json(&path)
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config_to_file(config: AppConfig, path: String) -> Result<(), String> {
    if path.ends_with(".yaml") || path.ends_with(".yml") {
        config.to_yaml(&path)
    } else {
        config.to_json(&path)
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_sample_config() -> AppConfig {
    generate_sample_config()
}

#[tauri::command]
fn start_workflow(state: State<AppState>, workflow: Workflow) -> Result<(), String> {
    for app_id in workflow.apps {
        state
            .process_manager
            .lock()
            .unwrap()
            .start_with_dependencies(&app_id)
            .map_err(|e| e.to_string())?;

        // 各アプリ起動後に少し待機
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    Ok(())
}

#[tauri::command]
async fn run_script(
    app: AppHandle,
    _script_state: State<'_, ScriptState>,
    request: ScriptRunRequest,
) -> Result<(), String> {
    let session_id = request.session_id.clone();
    let app_clone = app.clone();

    // Determine the shell command based on language
    let (shell, shell_args, _script_ext) = match request.language.as_str() {
        "powershell" => ("powershell", vec!["-NoProfile", "-Command"], ".ps1"),
        "batch" | "cmd" => ("cmd", vec!["/C"], ".bat"),
        "python" => ("python", vec!["-c"], ".py"),
        "node" => ("node", vec!["-e"], ".js"),
        _ => {
            // Default to PowerShell on Windows for bash-like scripts
            #[cfg(windows)]
            {
                ("powershell", vec!["-NoProfile", "-Command"], ".ps1")
            }
            #[cfg(not(windows))]
            {
                ("bash", vec!["-c"], ".sh")
            }
        }
    };

    // Build the command
    let mut cmd = Command::new(shell);

    for arg in shell_args {
        cmd.arg(arg);
    }

    // For python and node, pass the script content directly
    // For shell scripts, we need to handle differently
    if request.language == "python" || request.language == "node" {
        cmd.arg(&request.script_content);
    } else {
        // For shell scripts, pass the content
        cmd.arg(&request.script_content);
    }

    // Set working directory
    if let Some(ref dir) = request.working_dir {
        cmd.current_dir(dir);
    }

    // Set environment variables
    for (key, value) in &request.env_vars {
        cmd.env(key, value);
    }

    // Configure for output capture
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    // Spawn the process
    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn process: {}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let session_id_stdout = session_id.clone();
    let session_id_stderr = session_id.clone();
    let app_stdout = app_clone.clone();
    let app_stderr = app_clone.clone();

    // Spawn thread to read stdout
    let stdout_handle = std::thread::spawn(move || {
        if let Some(stdout) = stdout {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_stdout.emit(
                        "script-output",
                        ScriptOutput {
                            session_id: session_id_stdout.clone(),
                            line,
                            is_stderr: false,
                        },
                    );
                }
            }
        }
    });

    // Spawn thread to read stderr
    let stderr_handle = std::thread::spawn(move || {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_stderr.emit(
                        "script-output",
                        ScriptOutput {
                            session_id: session_id_stderr.clone(),
                            line,
                            is_stderr: true,
                        },
                    );
                }
            }
        }
    });

    // Wait for process to complete in a separate thread
    let session_id_complete = session_id.clone();
    std::thread::spawn(move || {
        // Wait for output threads
        let _ = stdout_handle.join();
        let _ = stderr_handle.join();

        // Wait for process to exit
        let exit_status = child.wait();
        let (exit_code, success) = match exit_status {
            Ok(status) => (status.code(), status.success()),
            Err(_) => (None, false),
        };

        let _ = app_clone.emit(
            "script-complete",
            ScriptComplete {
                session_id: session_id_complete,
                exit_code,
                success,
            },
        );
    });

    Ok(())
}

#[tauri::command]
fn stop_script(script_state: State<ScriptState>, session_id: String) -> Result<(), String> {
    let mut scripts = script_state.running_scripts.lock().unwrap();
    if let Some(mut child) = scripts.remove(&session_id) {
        child.kill().map_err(|e| format!("Failed to kill process: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            process_manager: Mutex::new(ProcessManager::new()),
        })
        .manage(ScriptState {
            running_scripts: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            register_app,
            start_process,
            stop_process,
            restart_process,
            get_all_processes,
            get_process,
            update_system_info,
            start_with_dependencies,
            stop_all,
            load_config,
            save_config,
            load_config_from_file,
            save_config_to_file,
            get_sample_config,
            start_workflow,
            run_script,
            stop_script,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
