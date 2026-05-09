# @musescore-linter/core

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
