#!/usr/bin/env bash
# PreToolUse Bash: `--no-verify` / `--no-gpg-sign` 等で lefthook / commit signing を
# skip するコマンドを block する。
# 失敗時: exit 2 でブロックし、Claude に理由を返す。
set -euo pipefail

payload="$(cat)"

if command -v jq >/dev/null 2>&1; then
	command="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')"
else
	command="$(printf '%s' "$payload" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log((JSON.parse(d).tool_input||{}).command||"")}catch{console.log("")}})')"
fi

[ -z "$command" ] && exit 0

# 検出パターン: --no-verify / --no-gpg-sign / -c commit.gpgsign=false
if printf '%s' "$command" | grep -Eq -- '(--no-verify|--no-gpg-sign|commit\.gpgsign=false)'; then
	cat >&2 <<EOF
ブロック: pre-commit フックの skip は禁止です。
コマンド: $command
理由: biome check / typecheck が pre-commit で動いている。skip するとフォーマット / 型エラーが
      残ったままコミットされる。
対応: フックが失敗するなら根本原因（型エラー / lint エラー）を直す。どうしても skip が
      必要なら user に明示的に確認を取る。
詳細: CLAUDE.md「やってはいけないこと」
EOF
	exit 2
fi

exit 0
