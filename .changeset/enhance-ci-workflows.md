---
"musescore-linter-plugin": patch
---

CI ワークフローを強化

- `ci.yml`: concurrency による重複実行キャンセル、permissions 最小化、Turborepo キャッシュを PR は restore のみ・main push 時のみ save に変更、Node.js を 22 → 24 に更新、push トリガーを main ブランチのみに限定
- `release.yml`: `id-token: write` 追加、`fetch-depth: 0` 追加、Node.js を 24 に更新
- `codeql.yml` 新規追加: 毎週月曜に JavaScript/TypeScript のセキュリティスキャンを実行
- `dependency-review.yml` 新規追加: main への PR で高深刻度の脆弱性と問題ライセンスをブロック
