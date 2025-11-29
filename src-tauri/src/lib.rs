mod config;
mod process_manager;

use config::{generate_sample_config, AppConfig, Workflow};
use process_manager::{AppDefinition, ProcessInfo, ProcessManager};
use std::sync::Mutex;
use tauri::State;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            process_manager: Mutex::new(ProcessManager::new()),
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
