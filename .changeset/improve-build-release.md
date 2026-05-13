---
"musescore-linter-plugin": patch
---

ビルドシステムとリリーススクリプトを整理

- `scripts/package.ts` を追加: `pnpm run package` で配布用 ZIP をローカル生成できるようになった
- ZIP 構造を改善: `musescore-linter/` サブフォルダにビルド済みファイルのみをまとめる形式に変更（重複ファイルや存在しないインストーラースクリプトへの参照を除去）
- `release.yml` のインラインシェル ZIP 作成を `pnpm run package` 呼び出しに置き換え
