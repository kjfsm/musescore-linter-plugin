---
"musescore-linter-plugin": patch
---

Biome を導入し、release.js を廃止してリリースフローを簡略化

- `@biomejs/biome` を追加してコード品質チェック・フォーマットを統一
- CI に `lint` ジョブを追加（`pnpm lint` で Biome チェックを実行）
- `scripts/release.js` を廃止し、ZIP 作成・GitHub Release 作成を `release.yml` のシェルステップにインライン化
- `stdio: "inherit"` 時の `execSync` が `null` を返してクラッシュするバグを修正（release.js 廃止により解消）
- GitHub Actions の Node.js 20 非推奨警告に対応（`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`）
