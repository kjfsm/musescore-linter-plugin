#!/usr/bin/env bash
# PreToolUse Write|Edit: 保護されたパスへの書き込みを block する。
# 失敗時: exit 2 でブロックし、Claude に理由を返す。
set -euo pipefail

payload="$(cat)"

if command -v jq >/dev/null 2>&1; then
	file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"
else
	file_path="$(printf '%s' "$payload" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log((JSON.parse(d).tool_input||{}).file_path||"")}catch{console.log("")}})')"
fi

[ -z "$file_path" ] && exit 0

# 対象パス:
#   - .env: シークレットファイル
#   - dist/ / build/ / .turbo/: ビルド成果物
#   - pnpm-lock.yaml / package-lock.json / yarn.lock: パッケージマネージャが生成
#   - node_modules/: 依存
case "$file_path" in
	*/.env|*/.env.local|*/.env.production|\
	*/dist/*|*/build/*|*/.turbo/*|\
	*/pnpm-lock.yaml|*/package-lock.json|*/yarn.lock|\
	*/node_modules/*)
		cat >&2 <<EOF
ブロック: 保護されたパスへの書き込みは禁止です。
パス: $file_path
理由:
  - .env: シークレット。commit 禁止
  - dist/ / build/ / .turbo/: ビルド成果物。ビルドコマンドで再生成（pnpm build）
  - pnpm-lock.yaml / package-lock.json / yarn.lock: pnpm install で生成
  - node_modules/: 依存。手で触らない
対応: ソース側を編集するか、対応する生成コマンドを実行してください。
EOF
		exit 2
		;;
esac

exit 0
