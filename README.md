# 🚀 Launch Manager

Tauri ベースの高性能プロセス管理・オーケストレーションツール

複数のアプリケーション、スクリプト、サービスを一元管理し、依存関係を考慮した起動制御、リアルタイム監視、自動再起動機能を提供します。

## ✨ 主な機能

### プロセス管理

- **柔軟な起動制御**: Python、Node.js、バッチスクリプト、実行ファイルなど、あらゆるプログラムに対応
- **依存関係管理**: アプリケーション間の依存関係を定義し、正しい順序で起動
- **リアルタイム監視**: CPU 使用率、メモリ使用量、プロセス状態をリアルタイムで可視化
- **自動再起動**: クラッシュ時の自動復旧機能

### 設定管理

- **YAML/JSON 設定**: 直感的な設定ファイル形式
- **ワークフロー**: 複数アプリの一括起動設定
- **環境変数**: アプリごとにカスタマイズ可能
- **ヘルスチェック**: TCP、HTTP、プロセスチェックに対応

### UI/UX

- **モダンなダッシュボード**: React + TypeScript による美しい UI
- **リアルタイム更新**: 2 秒ごとに自動更新
- **ステータス可視化**: 視認性の高いステータスバッジ
- **簡単操作**: ワンクリックで起動/停止/再起動

## 🛠️ 技術スタック

- **フロントエンド**: React, TypeScript, Vite
- **バックエンド**: Rust (Tauri)
- **プロセス管理**: Tokio, sysinfo
- **設定管理**: serde_yaml, serde_json

## 📦 インストール

### 前提条件

- Node.js 18 以上
- Rust 1.70 以上
- pnpm (推奨) または npm

### セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd launch-manager

# 依存関係をインストール
pnpm install

# Rust依存関係をビルド
cd src-tauri
cargo build
cd ..

# 開発サーバーを起動
pnpm tauri dev
```

## 📖 使い方

### 1. 設定ファイルの作成

`config.yaml` を作成してアプリケーションを定義:

```yaml
version: "1.0.0"
apps:
  - id: "backend-api"
    name: "Backend API Server"
    command: "python"
    args:
      - "-m"
      - "uvicorn"
      - "main:app"
    working_dir: "./backend"
    env:
      PORT: "8000"
    dependencies: []
    auto_restart: true
    health_check:
      interval_seconds: 15
      timeout_seconds: 5
      check_type:
        type: "HttpGet"
        url: "http://localhost:8000/health"

  - id: "frontend-dev"
    name: "Frontend Dev Server"
    command: "npm"
    args:
      - "run"
      - "dev"
    working_dir: "./frontend"
    env:
      VITE_API_URL: "http://localhost:8000"
    dependencies:
      - "backend-api"
    auto_restart: false

workflows:
  - id: "full-stack"
    name: "Full Stack Development"
    description: "Start backend and frontend"
    apps:
      - "backend-api"
      - "frontend-dev"
```

### 2. アプリケーションの起動

1. Launch Manager を起動
2. 「サンプル設定をロード」ボタンでサンプル設定を読み込む、または独自の設定を作成
3. 個別アプリを起動、またはワークフローで一括起動
4. リアルタイムでステータスを監視

### 3. プロセス制御

- **起動**: アプリカードの「起動」ボタンをクリック（依存関係も自動起動）
- **停止**: 実行中のアプリの「停止」ボタンをクリック
- **再起動**: 「再起動」ボタンでプロセスを再起動
- **全停止**: ツールバーの「全て停止」で全プロセスを一括停止

## 🎯 ユースケース

### 開発環境の統合管理

複数のマイクロサービス、データベース、フロントエンドサーバーを一括起動・管理

### デイリーワークフローの自動化

毎日使うツール群（エディタ、ターミナル、監視ツールなど）を一発起動

### 複雑な依存関係の制御

「DB が起動してから → バックエンド → フロントエンド」のような順序制御

### リソース監視

各プロセスの CPU/メモリ使用量をリアルタイムで把握

## 🔧 設定オプション

### AppDefinition

| フィールド     | 型           | 説明                                      |
| -------------- | ------------ | ----------------------------------------- |
| `id`           | string       | 一意の識別子                              |
| `name`         | string       | 表示名                                    |
| `command`      | string       | 実行コマンド (python, node, cmd.exe など) |
| `args`         | string[]     | コマンドライン引数                        |
| `working_dir`  | string?      | 作業ディレクトリ                          |
| `env`          | object       | 環境変数                                  |
| `dependencies` | string[]     | 依存する他のアプリの ID                   |
| `auto_restart` | boolean      | 自動再起動の有効化                        |
| `health_check` | HealthCheck? | ヘルスチェック設定                        |

### HealthCheckType

- **Process**: プロセスの生存確認のみ
- **HttpGet**: HTTP エンドポイントの確認
- **TcpPort**: TCP ポートの接続確認

## 🚧 今後の拡張予定

- [ ] ログ表示機能（stdout/stderr のリアルタイム表示）
- [ ] プロセスのスケジュール起動
- [ ] REST API サーバー機能
- [ ] プラグインシステム
- [ ] AI 活用（異常検知、最適化提案）
- [ ] Docker/Podman コンテナ管理
- [ ] クラウドサービス連携

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

Issue、Pull Request を歓迎します！
