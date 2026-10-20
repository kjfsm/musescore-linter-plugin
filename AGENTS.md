# score-linter

MuseScore 4 向け静的解析プラグイン。pnpm monorepo。ビルド・テスト・リリースは Turborepo + Changesets。
コマンド・ディレクトリ構成は [README.md](./README.md)。検証ゲートの正は `.github/workflows/ci.yml`（`pnpm lint` → `pnpm knip` → `pnpm pipeline` → `pnpm test:coverage`）。

## 構成の要点

**LintIR を作る側と使う側が分離している。** `core`（LintIR・linter・checker registry）と
`checkers` は MuseScore に依存しない。MuseScore を触るのは `source-musescore`・`musescore-api`・`musescore-plugin-helpers`・`musescore-api-types` だけで、
`source-musicxml` は MusicXML から同じ LintIR を作る。ホストは `apps/`（`plugin`・`cli`・`web`）。

- LintIR の型定義（`packages/core/src/types.ts`）は、checker の都合で変えない。
- `apps/web` はブラウザ完結の Web 版で、`main` を持たない assets-only Worker として配信する。
  **サーバー処理（`wrangler.jsonc` の `main`・サーバー通信）を足さない** — 「ファイルを送信しない」という保証がこの構成に依存している。
- `apps/web` の UI は CSP（`style-src 'self'`）の制約を受ける。`style` 属性・インライン `<script>` を書かない。詳細は README「Web 版」節。

## MuseScore API の型と helpers

`packages/musescore-api-types` と `packages/musescore-plugin-helpers` は、旧 `kjfsm/musescore-plugin-sdk`
を取り込んだもの。npm には公開しない。

- `packages/musescore-api-types/src/generated/` は生成物。手で直さず、`tools/musescore-api-types-generator`
  を直して `pnpm generate:types` で作り直す。
- MuseScore API を扱う処理が helpers に足りなければ、source 側で回避せず helpers に足す。
