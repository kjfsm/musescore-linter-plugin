---
"musescore-linter-plugin": patch
---

CI ワークフローをさらに強化

- `ci.yml`: `typecheck` + `test` の並列ジョブに分割（型エラーの早期フィードバック）、`pnpm audit --audit-level=high` による脆弱性チェック追加（GHAS 不要）、`codecov/codecov-action` によるカバレッジ計測・送信追加
- `vitest.config.ts`: v8 プロバイダーの coverage 設定を追加（lcov レポート生成）
- `package.json`: `@vitest/coverage-v8` 追加、`test:coverage` スクリプト追加
- `.gitignore`: `coverage/` を追加
- `release.yml`: `id-token: write` 追加、`fetch-depth: 0` 追加、Node.js を 24 に更新
- `codeql.yml` 新規追加: 毎週月曜に JS/TS セキュリティスキャンを実行（GHAS 有効化後に利用可能）
