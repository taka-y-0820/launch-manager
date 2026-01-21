# 🚀 Launch Manager - 設定管理ガイド

## 柔軟な設定ファイル管理

Launch Manager は、YAML/JSON 形式の設定ファイルで、アプリケーションの起動を柔軟に管理できます。

## 主な機能

### 1. 設定ファイルのインポート/エクスポート

UI から簡単に設定ファイルの読み込みと保存が可能：

- **インポート**: YAML または JSON ファイルを選択して設定を読み込み
- **エクスポート**: 現在の設定を YAML/JSON 形式で保存
- **自動バリデーション**: 設定読み込み時に自動で妥当性チェック

### 2. UI 上での設定編集

**アプリケーション管理**:

- ✏️ 編集: 専用エディタでアプリの詳細設定
- 🔄 複製: 既存アプリをテンプレートとして複製
- ❌ 削除: 不要なアプリを削除
- ➕ 追加: テンプレートまたはカスタムで新規追加

**編集可能な項目**:

- ID、名前、コマンド、引数
- 作業ディレクトリ
- 環境変数（KEY=value 形式）
- 依存関係（他のアプリ ID）
- 自動再起動の有効/無効

### 3. アプリテンプレート

よく使う構成をテンプレートから選択：

| テンプレート          | 用途             | コマンド例                        |
| --------------------- | ---------------- | --------------------------------- |
| Node.js アプリ        | Node.js サーバー | `node index.js`                   |
| Python スクリプト     | Python アプリ    | `python main.py`                  |
| Web サーバー          | 開発サーバー     | `npm run dev`                     |
| データベース          | Redis 等         | `redis-server`                    |
| バッチスクリプト      | Windows バッチ   | `cmd.exe /c script.bat`           |
| PowerShell スクリプト | PowerShell       | `powershell.exe -File script.ps1` |

### 4. 設定のバリデーション

設定の妥当性を自動チェック：

- ✅ 必須フィールドの存在確認
- ✅ ID 重複チェック
- ✅ 循環依存関係の検出
- ✅ ヘルスチェック設定の検証
- ✅ URL/ポート番号の形式チェック

エラーや警告は UI 上に表示され、問題箇所を特定できます。

### 5. JSON 直接編集モード

高度なユーザー向け：

1. 設定タブで「編集モード」をクリック
2. JSON を直接編集
3. 「適用」で設定を反映

## 設定ファイル例

### YAML 形式

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
      - "--reload"
    working_dir: "./backend"
    env:
      PORT: "8000"
      DATABASE_URL: "postgresql://localhost/mydb"
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
    health_check:
      interval_seconds: 10
      timeout_seconds: 5
      check_type:
        type: "TcpPort"
        port: 5173

workflows:
  - id: "full-stack"
    name: "Full Stack Development"
    description: "Start entire development environment"
    apps:
      - "backend-api"
      - "frontend-dev"
```

## 設定のベストプラクティス

### 1. アプリ ID の命名規則

```yaml
# ✅ Good
id: "backend-api"
id: "database-redis"
id: "worker_queue"

# ❌ Bad
id: "Backend API"  # スペースを含む
id: "バックエンド"   # 非ASCII文字
```

### 2. 依存関係の設定

依存するアプリが起動してから次のアプリを起動：

```yaml
apps:
  - id: "database"
    # データベースが先に起動

  - id: "backend"
    dependencies:
      - "database" # データベースに依存

  - id: "frontend"
    dependencies:
      - "backend" # バックエンドに依存
```

### 3. 環境変数の管理

```yaml
env:
  # 開発環境
  NODE_ENV: "development"
  DEBUG: "true"

  # 接続情報
  DATABASE_URL: "postgresql://localhost/dev"
  REDIS_URL: "redis://localhost:6379"

  # ポート番号
  PORT: "3000"
```

### 4. ヘルスチェックの設定

**HTTP ヘルスチェック**（API サーバー向け）:

```yaml
health_check:
  interval_seconds: 15
  timeout_seconds: 5
  check_type:
    type: "HttpGet"
    url: "http://localhost:8000/health"
```

**TCP ポートチェック**（データベース、キャッシュ向け）:

```yaml
health_check:
  interval_seconds: 10
  timeout_seconds: 5
  check_type:
    type: "TcpPort"
    port: 6379
```

**プロセスチェック**（バッチ処理向け）:

```yaml
health_check:
  interval_seconds: 30
  timeout_seconds: 10
  check_type:
    type: "Process"
```

## 設定ファイルの保存場所

デフォルトの設定ファイル:

- Windows: `%APPDATA%\launch-manager\config.yaml`
- macOS: `~/Library/Application Support/launch-manager/config.yaml`
- Linux: `~/.config/launch-manager/config.yaml`

カスタムの設定ファイルは任意の場所に保存可能で、「インポート」機能で読み込めます。

## トラブルシューティング

### 設定が反映されない

1. バリデーションエラーを確認
2. 「設定を保存」ボタンをクリック
3. アプリを再登録（設定タブで設定を保存）

### 循環依存エラー

```
循環依存が検出されました: app-a → app-b → app-a
```

依存関係を見直し、ループを解消してください。

### アプリが起動しない

1. コマンドパスが正しいか確認
2. 作業ディレクトリが存在するか確認
3. 環境変数が正しく設定されているか確認
4. 依存アプリが起動しているか確認

## さらに高度な使い方

### 環境別設定

開発、ステージング、本番環境で異なる設定を使用：

```bash
# 開発環境
config.dev.yaml

# ステージング環境
config.staging.yaml

# 本番環境
config.prod.yaml
```

UI で適切な設定ファイルをインポートして切り替え。

### 設定の共有

チーム内で設定を共有：

1. 設定をエクスポート
2. Git リポジトリにコミット
3. チームメンバーがインポート

### バックアップ

重要な設定は定期的にエクスポートしてバックアップを作成。

---

より詳しい情報は [README.md](./README.md) を参照してください。
