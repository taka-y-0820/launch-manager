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
  scripts?: Script[];
  environments?: Environment[];
  schedules?: Schedule[];
}

// ===== Script Management =====

export type ScriptLanguage = "bash" | "powershell" | "batch" | "python" | "node";

export interface Script {
  id: string;
  name: string;
  content: string;
  language: ScriptLanguage;
  description?: string;
  environments: string[]; // Which env IDs this script can run in
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
  color: string; // For visual distinction
}

export interface Schedule {
  id: string;
  script_id: string;
  environment_id: string;
  name: string;
  cron?: string; // Cron expression for recurring
  once_at?: string; // ISO date for one-time
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

// ===== Terminal =====

export type TerminalStatus = "idle" | "running" | "completed" | "failed";

export interface TerminalSession {
  id: string;
  name: string;
  script_id?: string;
  environment_id?: string;
  output: string[];
  status: TerminalStatus;
  started_at?: string;
  exit_code?: number;
}
