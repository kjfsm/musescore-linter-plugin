# CLAUDE.md

未来の Claude Code セッション向け。**このファイルは毎セッション読まれるので最小限に保つ**。詳細はリンク先。

## 概要

MuseScore 4 向け静的解析プラグイン。pnpm monorepo。ビルド・テスト・リリースは Turborepo + Changesets。

**LintIR を作る側と使う側が分離している**のが構成の要点。`core`（LintIR・linter・checker registry）と
`checkers` は MuseScore に依存しない。MuseScore を触るのは `source-musescore` だけで、
`source-musicxml` は MusicXML から同じ LintIR を作る。`cli` は `musescore-lint` コマンド。
`apps/web` はブラウザ完結の Web 版（React + shadcn/ui）で、`main` を持たない assets-only Worker
として Cloudflare へ配信する。**サーバー処理を足してはいけない**（「ファイルを送信しない」という
保証がこの構成に依存している）。UI の CSP 制約は README「Web 版」節を参照。

コマンド・ディレクトリ構成・ライブラリ一覧は [README.md](./README.md) 参照。

## ドキュメント案内（タスク別）

| タスク               | 最初に読む                                                 |
| -------------------- | ---------------------------------------------------------- |
| **新 Checker 追加**  | `.claude/rules/checker-contract.md` + `/checker-add` skill |
| **Qt API 調査**      | `/musescore-qt-versions` skill                             |
| **テスト方針**       | `.claude/rules/testing.md`                                 |
| **エラー処理**       | `.claude/rules/error-handling.md`                          |
| **ドキュメント点検** | `/docs-audit` skill                                        |

## 自動注入される規約（`.claude/rules/`）

- **checker-contract** — Checker id/run 契約・LintIR 使い方・severity 基準・ir.index 優先
- **testing** — vitest 単体テスト責務・irBuilder 使い方
- **error-handling** — throw / never-catch 規約
- **musescore-plugin-api** — MuseScore 4.6 プラグイン API の罠(選択・`cmd()`・QML の GC)

## スキル（`.claude/skills/`）

- **`/checker-add`** — 新 Checker のスキャフォールドと登録手順
- **`/musescore-qt-versions`** — Qt バージョン対応表・QML ドキュメント参照
- **`/docs-audit`** — ドキュメント重複・矛盾の検出

## 専門レビュアー（`.claude/agents/`）

- **`checker-reviewer`** — 契約準拠・LintIR 使い方・テストカバレッジを独立査読

## 自動 block（`.claude/settings.json` の `permissions.deny`）

- `.env*` / `dist/` / `dist-cli/` / `.turbo/` / `coverage/` / `node_modules/` / lockfile への読み書き
- `--no-verify` / `--no-gpg-sign` は `~/.claude/hooks/block-no-verify.sh` が全プロジェクト共通で弾く
  （このリポジトリは simple-git-hooks の pre-commit で `pnpm lint` を回しているので対象になる）

規則は `Read` と `Edit` にしか書けない（`Write(...)` にパスを書いても参照されない）。
deny は Bash の `cat` / `head` / `tail` / `sed` / `tee` の引数とリダイレクト先にも掛かる。
**すり抜けるのはパスを名指ししない読み書きだけ**（`grep -r pattern .` など）。

## ライブラリ側の機能が不足している場合

`@kjfsm/musescore-plugin-sdk-helpers` や `@kjfsm/musescore-plugin-sdk-types` に必要な機能が存在しない場合は、**このプラグイン側で回避実装をしてはいけない**。作業を止め、不足機能の具体名・追加が必要なパッケージ・判断根拠をユーザーに報告する。

## やってはいけないこと

- `main` への直 push（原則。急ぎで直接入れることはあってよいが、既定の経路にはしない）
- Checker 内で例外を catch（linter が全体でハンドリングする）
- `packages/core/src/types.ts`（LintIR の型定義）を checker 側から直接変更
- `core` / `checkers` に MuseScore SDK への依存を持ち込む（入力ソース側の責務）
- `apps/web` に Worker スクリプト（`wrangler.jsonc` の `main`）やサーバー通信を足す
- `apps/web` で `style` 属性・インライン `<script>` を書く（CSP で落ちる。README「Web 版」節）
