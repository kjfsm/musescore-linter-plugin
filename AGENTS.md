# musescore-plugin-sdk

MuseScore 4 プラグインを TypeScript で書くための SDK。MuseScore プラグインは `.qml` ファイル（QML + 埋め込み JavaScript）であり、本リポジトリではその JS 部分を TypeScript で記述できるようにし、公式の MuseScore C++ ヘッダから直接生成された型定義を提供する。

## `.claude/` を編集する際の手順

`.claude/`（スキル、エージェント、設定など）に変更を加えるときは、次の手順を踏む。編集途中の不完全な状態が `.claude/` に直接反映されるのを防ぎ、変更をアトミックに適用するため。

1. `.claude-next/` を作業用ディレクトリとして作成し、変更内容をすべてそちらに書く（既存のファイルは `.claude-next/` にコピーしてから編集する）。
2. 動作確認・レビューが終わったら、`.claude-next/` の中身を `.claude/` にまとめてコピー（上書き）する。
3. コピー後、`.claude-next/` は削除する。

## このリポジトリの約束

- 検証ゲートは CI と同じ列で、正は `.github/workflows/ci.yml`（`lint` → `typecheck` → `test` → `build` → `publint` → `attw` と、生成物のドリフト検査 `generated-types-drift`）。
- `packages/types/src/generated/` は生成物。直すときはジェネレータか `packages/types-generator/config.json` を変えて `pnpm generate:types` で作り直す。
- `.ts` ソースからの相対 import でも拡張子は `.js` を書く。
- 公開パッケージ（`packages/types`・`packages/helpers`）に変更を加えたら、`pnpm changeset` で changeset を足す。bump の種別は `.claude/rules/releasing.md`（型の major ⇔ MuseScore の minor）。
- プラグインを書く・直すときの QML と TS の橋渡し（`build.ts` の `exportNames`、`plugin.qml` と `musescore.config.ts` の手作業の同期、enum は実行時のホストから取る）は `musescore-plugin` スキルが持つ。
