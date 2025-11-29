# Launch Manager - クイックスタートガイド

## 🎯 概要

Launch Manager は、複数のアプリケーション、スクリプト、サービスを統合管理する Tauri ベースのオーケストレーションツールです。

## 🚀 起動方法

```bash
# 開発モードで起動
pnpm tauri dev

# プロダクションビルド
pnpm tauri build
```

## 📝 基本的な使い方

### 1. サンプル設定のロード

初回起動時は、アプリケーション内の「サンプル設定をロード」ボタンをクリックして、サンプル設定を確認してください。

### 2. カスタム設定の作成

`config.yaml`ファイルを作成して、管理したいアプリケーションを定義します。

```yaml
version: "1.0.0"
apps:
  - id: "my-app"
    name: "My Application"
    command: "python" # または node, npm, cmd.exe など
    args:
      - "main.py"
    working_dir: "./my-app"
    env:
      DEBUG: "true"
    dependencies: []
    auto_restart: true
```

### 3. よくあるユースケース

#### Python スクリプトの実行

```yaml
- id: "data-processor"
  name: "Data Processing Script"
  command: "python"
  args:
    - "-u" # unbuffered output
    - "process_data.py"
  working_dir: "./scripts"
  env:
    PYTHONUNBUFFERED: "1"
  dependencies: []
  auto_restart: false
```

#### Node.js サーバーの起動

```yaml
- id: "api-server"
  name: "REST API Server"
  command: "npm"
  args:
    - "run"
    - "start"
  working_dir: "./backend"
  env:
    NODE_ENV: "development"
    PORT: "3000"
  dependencies: []
  auto_restart: true
  health_check:
    interval_seconds: 10
    timeout_seconds: 5
    check_type:
      type: "TcpPort"
      port: 3000
```

#### Windows バッチスクリプト

```yaml
- id: "backup-script"
  name: "Daily Backup"
  command: "cmd.exe"
  args:
    - "/c"
    - "backup.bat"
  working_dir: "C:\\Scripts"
  env: {}
  dependencies: []
  auto_restart: false
```

#### PowerShell スクリプト

```yaml
- id: "monitor-service"
  name: "System Monitor"
  command: "powershell.exe"
  args:
    - "-ExecutionPolicy"
    - "Bypass"
    - "-File"
    - "monitor.ps1"
  working_dir: "./scripts"
  env: {}
  dependencies: []
  auto_restart: true
```

### 4. 依存関係の定義

データベースを起動してから、その後にアプリケーションを起動する場合:

```yaml
apps:
  - id: "postgres-db"
    name: "PostgreSQL Database"
    command: "docker"
    args:
      - "run"
      - "--rm"
      - "-p"
      - "5432:5432"
      - "postgres:15"
    dependencies: []
    auto_restart: true

  - id: "web-app"
    name: "Web Application"
    command: "npm"
    args:
      - "start"
    working_dir: "./app"
    dependencies:
      - "postgres-db" # DBが起動してから起動
    auto_restart: true
```

### 5. ワークフローの活用

複数のアプリを一括で起動:

```yaml
workflows:
  - id: "full-dev"
    name: "フル開発環境"
    description: "データベース、バックエンド、フロントエンドを全て起動"
    apps:
      - "postgres-db"
      - "redis-cache"
      - "backend-api"
      - "frontend-dev"
```

## 🎨 UI 操作ガイド

### プロセス管理タブ

- **ワークフロー起動**: 複数アプリを一括起動
- **個別起動**: アプリカードの「起動」ボタン（依存関係も自動起動）
- **停止**: 実行中のアプリを停止
- **再起動**: プロセスを再起動
- **全停止**: 全てのプロセスを一括停止

### 設定タブ

- **サンプル設定ロード**: デモ用の設定を読み込み
- **設定表示**: 現在の設定内容を確認

## 📊 ステータス表示

各プロセスカードには以下の情報が表示されます:

- **ステータス**: Running, Stopped, Failed など
- **PID**: プロセス ID
- **CPU 使用率**: リアルタイムの CPU 使用率
- **メモリ使用量**: 現在のメモリ消費量
- **再起動回数**: クラッシュ・再起動の履歴
- **エラーメッセージ**: 問題が発生した場合のメッセージ

## 🔧 トラブルシューティング

### プロセスが起動しない

1. コマンドパスが正しいか確認（絶対パスまたは PATH 上のコマンド）
2. `working_dir`が存在するか確認
3. 必要な依存アプリが先に起動しているか確認

### ヘルスチェックが失敗する

- ポート番号が正しいか確認
- アプリケーションが完全に起動するまで時間がかかる場合は`interval_seconds`を調整

### 自動再起動が頻発する

- アプリケーション自体のエラーログを確認
- 環境変数や設定が正しいか確認
- `auto_restart: false`に設定して手動でトラブルシューティング

## 💡 ベストプラクティス

### 1. 環境変数の活用

開発・本番環境で切り替え可能な設定:

```yaml
env:
  NODE_ENV: "development"
  DATABASE_URL: "postgresql://localhost:5432/dev"
  LOG_LEVEL: "debug"
```

### 2. 作業ディレクトリの明示

相対パスの問題を避けるため、必ず`working_dir`を指定:

```yaml
working_dir: "./my-app" # 推奨
```

### 3. ヘルスチェックの設定

重要なサービスにはヘルスチェックを設定:

```yaml
health_check:
  interval_seconds: 15
  timeout_seconds: 5
  check_type:
    type: "HttpGet"
    url: "http://localhost:8000/health"
```

### 4. ログのバッファリング無効化

Python の場合、リアルタイムログ出力のため:

```yaml
env:
  PYTHONUNBUFFERED: "1"
args:
  - "-u" # unbuffered
```

### 5. ワークフローの論理的なグルーピング

```yaml
workflows:
  - id: "backend-only"
    name: "バックエンドのみ"
    apps: ["db", "cache", "api"]

  - id: "frontend-only"
    name: "フロントエンドのみ"
    apps: ["ui-dev"]

  - id: "full-stack"
    name: "フルスタック"
    apps: ["db", "cache", "api", "ui-dev"]
```

## 🔐 セキュリティに関する注意

- 設定ファイルに機密情報（パスワード、API キーなど）を直接記述しない
- 環境変数やシークレット管理ツールを活用
- 本番環境では適切なアクセス制御を実装

## 📚 さらに詳しく

- [README.md](./README.md) - 詳細な機能説明
- [config.example.yaml](./config.example.yaml) - 設定例
