# score-linter

MuseScore 4 向け静的解析プラグイン。pnpm monorepo。ビルド・テスト・リリースは Turborepo + Changesets。
コマンド・ディレクトリ構成は [README.md](./README.md)。検証ゲートの正は `.github/workflows/ci.yml`（`pnpm lint` → `pnpm knip` → `pnpm pipeline` → `pnpm test:coverage`）。

## 構成の要点

**楽譜を読む側と、検査する側が分離している。** `score-model` が楽譜の構造と解釈済みの Directive を持つ
（ソースにもホストにも依存しない）。`reader-musicxml`・`reader-musescore` が Score を作り、
`linter` のルールは `score-model` だけを見る。MuseScore を触るのは `reader-musescore` と
`musescore-plugin-helpers`・`musescore-api-types` だけ。`lint-app` は設定・並べ替え・件数・出力の整形を持ち、
ホスト（`apps/plugin`・`cli`・`web`）はそれを呼ぶだけにする。

- 層の境界は各 package.json の依存と `.oxlintrc.json` の `no-restricted-imports` で守る。
  依存を足すときは両方を見直す。
- `score-model` の型（`packages/score-model/src/types.ts`）は、ルールの都合で変えない。ルールが欲しい情報は
  Directive の解釈（`interpret.ts`）か問い合わせ関数で出し、型に特定のルール専用の項目を足さない。
- プラグインのバンドルに入るコードは `apps/plugin/tsconfig.bundle.json` で ES2017 の標準ライブラリとして
  型検査する（QML の JS エンジンに無い API を弾くため）。バンドルに入る新しいパッケージは `include` に足す。
- `apps/web` はブラウザ完結の Web 版で、`main` を持たない assets-only Worker として配信する。
  **サーバー処理（`wrangler.jsonc` の `main`・サーバー通信）を足さない** — 「ファイルを送信しない」という保証がこの構成に依存している。
- `apps/web` の UI は CSP（`style-src 'self'`）の制約を受ける。`style` 属性・インライン `<script>` を書かない。詳細は README「Web 版」節。

## MuseScore API の型と helpers

`packages/musescore-api-types` と `packages/musescore-plugin-helpers` は、このリポジトリの中で持つ
（npm には公開しない）。

- `packages/musescore-api-types/src/generated/` は生成物。手で直さず、`tools/musescore-api-types-generator`
  を直して `pnpm generate:types` で作り直す。
- MuseScore API を扱う処理が helpers に足りなければ、`reader-musescore` やホストで回避せず helpers に足す。
- helpers は MuseScore API の言い換えに徹する。Score のための読み取り（強弱記号の文字化・綴り・小節線の分類など）は `reader-musescore` に置く。
