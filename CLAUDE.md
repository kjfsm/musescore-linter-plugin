# CLAUDE.md

未来の Claude Code セッション向け。**このファイルは毎セッション読まれるので最小限に保つ**。詳細はリンク先。

## 概要

MuseScore 4 向け静的解析プラグイン。pnpm monorepo（packages/core・checkers・musescore-api）。
ビルド・テスト・リリースは Turborepo + Changesets。

コマンド・ディレクトリ構成・ライブラリ一覧は [README.md](./README.md) 参照。

## ドキュメント案内（タスク別）

| タスク | 最初に読む |
|---|---|
| **新 Checker 追加** | `.claude/rules/checker-contract.md` + `/checker-add` skill |
| **Qt API 調査** | `/musescore-qt-versions` skill |
| **テスト方針** | `.claude/rules/testing.md` |
| **エラー処理** | `.claude/rules/error-handling.md` |
| **ドキュメント点検** | `/docs-audit` skill |

## 自動注入される規約（`.claude/rules/`）

- **checker-contract** — Checker id/run 契約・LintIR 使い方・severity 基準・ir.index 優先
- **testing** — vitest 単体テスト責務・irBuilder 使い方
- **error-handling** — throw / never-catch 規約

## スキル（`.claude/skills/`）

- **`/checker-add`** — 新 Checker のスキャフォールドと登録手順
- **`/musescore-qt-versions`** — Qt バージョン対応表・QML ドキュメント参照
- **`/docs-audit`** — ドキュメント重複・矛盾の検出

## 専門レビュアー（`.claude/agents/`）

- **`checker-reviewer`** — 契約準拠・LintIR 使い方・テストカバレッジを独立査読

## 自動 block（`.claude/hooks/`）

- `--no-verify` / `--no-gpg-sign` 付き git commit
- `dist/` / `node_modules/` / `pnpm-lock.yaml` への書き込み

## ライブラリ側の機能が不足している場合

`@kjfsm/musescore-plugin-sdk-helpers` や `@kjfsm/musescore-plugin-sdk-types` に必要な機能が存在しない場合は、**このプラグイン側で回避実装をしてはいけない**。作業を止め、不足機能の具体名・追加が必要なパッケージ・判断根拠をユーザーに報告する。

## やってはいけないこと

- `main` への直 push（必ずブランチ + PR）
- Checker 内で例外を catch（linter が全体でハンドリングする）
- `packages/core/src/lintIR.ts` を checker 側から直接変更
- `.claude/` の直接編集（`.claude-next/` 経由で変更後にコピー）
