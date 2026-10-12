# musescore-linter-plugin

MuseScore 4 向け静的解析プラグイン。pnpm monorepo。ビルド・テスト・リリースは Turborepo + Changesets。
コマンド・ディレクトリ構成は [README.md](./README.md)。検証ゲートの正は `.github/workflows/ci.yml`（`pnpm lint` → `pnpm knip` → `pnpm pipeline` → `pnpm test:coverage`）。

## 構成の要点

**LintIR を作る側と使う側が分離している。** `core`（LintIR・linter・checker registry）と
`checkers` は MuseScore に依存しない。MuseScore を触るのは `source-musescore` だけで、
`source-musicxml` は MusicXML から同じ LintIR を作る。`cli` は `musescore-lint` コマンド。

- LintIR の型定義（`packages/core/src/types.ts`）は、checker の都合で変えない。
- `apps/web` はブラウザ完結の Web 版で、`main` を持たない assets-only Worker として配信する。
  **サーバー処理（`wrangler.jsonc` の `main`・サーバー通信）を足さない** — 「ファイルを送信しない」という保証がこの構成に依存している。
- `apps/web` の UI は CSP（`style-src 'self'`）の制約を受ける。`style` 属性・インライン `<script>` を書かない。詳細は README「Web 版」節。

## ライブラリ側の機能が不足している場合

`@kjfsm/musescore-plugin-sdk-helpers` や `@kjfsm/musescore-plugin-sdk-types` に必要な機能が存在しない場合は、**このプラグイン側で回避実装をしない**。作業を止め、不足機能の具体名・追加が必要なパッケージ・判断根拠をユーザーに報告する。
