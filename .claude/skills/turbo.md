Run Turbo tasks for this project.

Available tasks (defined in turbo.json):
- `typecheck` — TypeScript 型チェック（全パッケージ）
- `test` — テスト実行（typecheck に依存）
- `build` — プラグインビルド（core・checkers のテスト通過後）

Shorthand pipelines (from package.json scripts):
- `pipeline` — typecheck → test → build の一括実行

Usage examples:
- `/turbo typecheck` → `!pnpm turbo run typecheck`
- `/turbo test` → `!pnpm turbo run test`
- `/turbo build` → `!pnpm turbo run build`
- `/turbo pipeline` → `!pnpm turbo run typecheck test build`

$ARGUMENTS が空の場合は pipeline を実行する:

!pnpm turbo run ${ARGUMENTS:-typecheck test build}
