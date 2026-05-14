# @musescore-linter/core

## 2.1.3

### Patch Changes

- c69f6a5: 重複ダイナミクスチェッカー: 間にヘアピン（クレッシェンド/デクレッシェンド）がある場合は重複判定しないよう修正

## 2.1.2

### Patch Changes

- [#58](https://github.com/kjfsm/musescore-linter-plugin/pull/58) [`1e9cc57`](https://github.com/kjfsm/musescore-linter-plugin/commit/1e9cc57bdcd871ca8870725f8e406210f9e43e77) Thanks [@kjfsm](https://github.com/kjfsm)! - `@kjfsm/musescore-plugin-sdk-helpers` を v0.1.0 → v1.0.1、`@kjfsm/musescore-plugin-sdk-types` を v0.0.2 → v0.1.0 にアップデート。

  SDK の型安全なヘルパー関数（`isChord`、`isRest`、`isBarLine`、`isTempo` 等）を利用するようリファクタリングし、QML 側から enum マップを渡す必要がなくなった。`buildSnapshot` の引数から `MuseScoreEnums` を削除。

## 2.1.1

### Patch Changes

- [#43](https://github.com/kjfsm/musescore-linter-plugin/pull/43) [`bf66404`](https://github.com/kjfsm/musescore-linter-plugin/commit/bf66404524c97a417d997c969c9a9fb5aa76ba78) Thanks [@kjfsm](https://github.com/kjfsm)! - chore: @kjfsm/musescore-plugin-sdk-helpers をインストール

## 2.1.0

### Minor Changes

- [#27](https://github.com/kjfsm/musescore-linter-plugin/pull/27) [`50ef241`](https://github.com/kjfsm/musescore-linter-plugin/commit/50ef24170bd9abb91b69ca3b60154d7c63f16ee8) Thanks [@kjfsm](https://github.com/kjfsm)! - TypeScript + pnpm monorepo への全面移行

  ## 主な変更点

  - **TypeScript 導入**: ビジネスロジック全体を TypeScript で書き直し、型安全性を確保
  - **pnpm workspaces + Turborepo**: `packages/core`・`packages/checkers` の内部モノレポ構成に移行。Turborepo によるビルド依存順序管理とキャッシュで CI を高速化
  - **esbuild バンドル**: `src/bundle-entry.ts` → `dist/bundle.js` のビルドパイプラインを整備。QML の `.pragma library` 制約に対応した IIFE 形式で出力
  - **Vitest 導入**: カスタム vm ベースのテストランナー（`test/loader.js`）を廃止し、TypeScript ネイティブな Vitest に移行
  - **QML UI 全面刷新**: Material Design インスパイアのレイアウトに刷新。severity バッジトグル、カテゴリ別折りたたみ設定、左ボーダーによる severity 強調など
  - **CI/CD 更新**: GitHub Actions ワークフローを pnpm + Turborepo キャッシュ対応に変更

### Patch Changes

- [#28](https://github.com/kjfsm/musescore-linter-plugin/pull/28) [`43902ef`](https://github.com/kjfsm/musescore-linter-plugin/commit/43902ef2e2d33e22841f4e5ffe538f2d503d136d) Thanks [@kjfsm](https://github.com/kjfsm)! - CI ワークフローをさらに強化

  - `ci.yml`: `typecheck` + `test` の並列ジョブに分割（型エラーの早期フィードバック）、`pnpm audit --audit-level=high` による脆弱性チェック追加（GHAS 不要）、`codecov/codecov-action` によるカバレッジ計測・送信追加
  - `vitest.config.ts`: v8 プロバイダーの coverage 設定を追加（lcov レポート生成）
  - `package.json`: `@vitest/coverage-v8` 追加、`test:coverage` スクリプト追加
  - `.gitignore`: `coverage/` を追加
  - `release.yml`: `id-token: write` 追加、`fetch-depth: 0` 追加、Node.js を 24 に更新
  - `codeql.yml` 新規追加: 毎週月曜に JS/TS セキュリティスキャンを実行（GHAS 有効化後に利用可能）

- [#25](https://github.com/kjfsm/musescore-linter-plugin/pull/25) [`dfb2cec`](https://github.com/kjfsm/musescore-linter-plugin/commit/dfb2cec5646545bbc23422e2dc7cfd470d774b8e) Thanks [@kjfsm](https://github.com/kjfsm)! - README と CLAUDE.md に CI・リリースフローのドキュメントを追加
