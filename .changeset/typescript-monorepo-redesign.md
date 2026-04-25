---
"@musescore-linter/core": minor
---

TypeScript + pnpm monorepo への全面移行

## 主な変更点

- **TypeScript 導入**: ビジネスロジック全体を TypeScript で書き直し、型安全性を確保
- **pnpm workspaces + Turborepo**: `packages/core`・`packages/checkers` の内部モノレポ構成に移行。Turborepo によるビルド依存順序管理とキャッシュで CI を高速化
- **esbuild バンドル**: `src/bundle-entry.ts` → `dist/bundle.js` のビルドパイプラインを整備。QML の `.pragma library` 制約に対応した IIFE 形式で出力
- **Vitest 導入**: カスタム vm ベースのテストランナー（`test/loader.js`）を廃止し、TypeScript ネイティブな Vitest に移行
- **QML UI 全面刷新**: Material Design インスパイアのレイアウトに刷新。severity バッジトグル、カテゴリ別折りたたみ設定、左ボーダーによる severity 強調など
- **CI/CD 更新**: GitHub Actions ワークフローを pnpm + Turborepo キャッシュ対応に変更
