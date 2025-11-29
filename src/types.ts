export interface AppDefinition {
  id: string;
  name: string;
  command: string;
  args: string[];
  working_dir?: string;
  env: Record<string, string>;
  dependencies: string[];
  auto_restart: boolean;
  health_check?: HealthCheckConfig;
}

export interface HealthCheckConfig {
  interval_seconds: number;
  timeout_seconds: number;
  check_type: HealthCheckType;
}

export type HealthCheckType =
  | { type: "Process" }
  | { type: "HttpGet"; url: string }
  | { type: "TcpPort"; port: number };

export type ProcessStatus =
  | "Stopped"
  | "Starting"
  | "Running"
  | "Stopping"
  | "Failed"
  | "Restarting";

export interface ProcessInfo {
  app_id: string;
  name: string;
  status: ProcessStatus;
  pid?: number;
  started_at?: string;
  stopped_at?: string;
  restart_count: number;
  cpu_usage: number;
  memory_usage: number;
  error_message?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  apps: string[];
}

export interface AppConfig {
  version: string;
  apps: AppDefinition[];
  workflows: Workflow[];
}
