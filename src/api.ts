import { invoke } from "@tauri-apps/api/core";
import type { AppDefinition, ProcessInfo, AppConfig, Workflow } from "./types";

export const api = {
  // プロセス管理
  async registerApp(definition: AppDefinition): Promise<void> {
    await invoke("register_app", { definition });
  },

  async startProcess(appId: string): Promise<void> {
    await invoke("start_process", { appId });
  },

  async stopProcess(appId: string): Promise<void> {
    await invoke("stop_process", { appId });
  },

  async restartProcess(appId: string): Promise<void> {
    await invoke("restart_process", { appId });
  },

  async getAllProcesses(): Promise<ProcessInfo[]> {
    return await invoke("get_all_processes");
  },

  async getProcess(appId: string): Promise<ProcessInfo | null> {
    return await invoke("get_process", { appId });
  },

  async updateSystemInfo(): Promise<void> {
    await invoke("update_system_info");
  },

  async startWithDependencies(appId: string): Promise<void> {
    await invoke("start_with_dependencies", { appId });
  },

  async stopAll(): Promise<void> {
    await invoke("stop_all");
  },

  // 設定管理
  async loadConfig(): Promise<AppConfig> {
    return await invoke("load_config");
  },

  async saveConfig(config: AppConfig): Promise<void> {
    await invoke("save_config", { config });
  },

  async loadConfigFromFile(path: string): Promise<AppConfig> {
    return await invoke("load_config_from_file", { path });
  },

  async saveConfigToFile(config: AppConfig, path: string): Promise<void> {
    await invoke("save_config_to_file", { config, path });
  },

  async getSampleConfig(): Promise<AppConfig> {
    return await invoke("get_sample_config");
  },

  async startWorkflow(workflow: Workflow): Promise<void> {
    await invoke("start_workflow", { workflow });
  },
};
