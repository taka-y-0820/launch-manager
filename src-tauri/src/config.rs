use crate::process_manager::AppDefinition;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// アプリケーション設定全体
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub version: String,
    pub apps: Vec<AppDefinition>,
    pub workflows: Vec<Workflow>,
}

/// ワークフロー定義（複数アプリの一括起動）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub apps: Vec<String>, // アプリIDのリスト
}

impl AppConfig {
    /// YAML ファイルから設定を読み込む
    pub fn from_yaml<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = fs::read_to_string(path.as_ref()).context("Failed to read config file")?;

        serde_yaml::from_str(&content).context("Failed to parse YAML config")
    }

    /// JSON ファイルから設定を読み込む
    pub fn from_json<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = fs::read_to_string(path.as_ref()).context("Failed to read config file")?;

        serde_json::from_str(&content).context("Failed to parse JSON config")
    }

    /// YAML ファイルに設定を保存
    pub fn to_yaml<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let content = serde_yaml::to_string(self).context("Failed to serialize to YAML")?;

        fs::write(path.as_ref(), content).context("Failed to write config file")
    }

    /// JSON ファイルに設定を保存
    pub fn to_json<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let content = serde_json::to_string_pretty(self).context("Failed to serialize to JSON")?;

        fs::write(path.as_ref(), content).context("Failed to write config file")
    }

    /// デフォルト設定パスを取得
    pub fn default_config_path() -> PathBuf {
        let config_dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));

        config_dir.join("launch-manager").join("config.yaml")
    }

    /// デフォルト設定を生成
    pub fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            apps: vec![],
            workflows: vec![],
        }
    }

    /// 設定をロード（存在しない場合はデフォルトを返す）
    pub fn load_or_default() -> Self {
        let config_path = Self::default_config_path();

        if config_path.exists() {
            Self::from_yaml(&config_path).unwrap_or_default()
        } else {
            Self::default()
        }
    }

    /// 設定を保存
    pub fn save(&self) -> Result<()> {
        let config_path = Self::default_config_path();

        // ディレクトリを作成
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)?;
        }

        self.to_yaml(&config_path)
    }
}

// サンプル設定を生成する関数
pub fn generate_sample_config() -> AppConfig {
    use crate::process_manager::{HealthCheckConfig, HealthCheckType};
    use std::collections::HashMap;

    AppConfig {
        version: "1.0.0".to_string(),
        apps: vec![
            AppDefinition {
                id: "redis-server".to_string(),
                name: "Redis Server".to_string(),
                command: "redis-server".to_string(),
                args: vec![],
                working_dir: None,
                env: HashMap::new(),
                dependencies: vec![],
                auto_restart: true,
                health_check: Some(HealthCheckConfig {
                    interval_seconds: 10,
                    timeout_seconds: 5,
                    check_type: HealthCheckType::TcpPort { port: 6379 },
                }),
            },
            AppDefinition {
                id: "backend-api".to_string(),
                name: "Backend API Server".to_string(),
                command: "python".to_string(),
                args: vec![
                    "-m".to_string(),
                    "uvicorn".to_string(),
                    "main:app".to_string(),
                ],
                working_dir: Some("./backend".to_string()),
                env: {
                    let mut env = HashMap::new();
                    env.insert("PORT".to_string(), "8000".to_string());
                    env.insert(
                        "REDIS_URL".to_string(),
                        "redis://localhost:6379".to_string(),
                    );
                    env
                },
                dependencies: vec!["redis-server".to_string()],
                auto_restart: true,
                health_check: Some(HealthCheckConfig {
                    interval_seconds: 15,
                    timeout_seconds: 5,
                    check_type: HealthCheckType::HttpGet {
                        url: "http://localhost:8000/health".to_string(),
                    },
                }),
            },
            AppDefinition {
                id: "frontend-dev".to_string(),
                name: "Frontend Dev Server".to_string(),
                command: "npm".to_string(),
                args: vec!["run".to_string(), "dev".to_string()],
                working_dir: Some("./frontend".to_string()),
                env: {
                    let mut env = HashMap::new();
                    env.insert(
                        "VITE_API_URL".to_string(),
                        "http://localhost:8000".to_string(),
                    );
                    env
                },
                dependencies: vec!["backend-api".to_string()],
                auto_restart: false,
                health_check: Some(HealthCheckConfig {
                    interval_seconds: 10,
                    timeout_seconds: 5,
                    check_type: HealthCheckType::TcpPort { port: 5173 },
                }),
            },
        ],
        workflows: vec![
            Workflow {
                id: "dev-stack".to_string(),
                name: "Development Stack".to_string(),
                description: Some("Full development environment".to_string()),
                apps: vec![
                    "redis-server".to_string(),
                    "backend-api".to_string(),
                    "frontend-dev".to_string(),
                ],
            },
            Workflow {
                id: "backend-only".to_string(),
                name: "Backend Only".to_string(),
                description: Some("Backend services without frontend".to_string()),
                apps: vec!["redis-server".to_string(), "backend-api".to_string()],
            },
        ],
    }
}
