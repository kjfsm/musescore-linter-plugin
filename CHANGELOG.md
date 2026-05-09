# musescore-linter-plugin

## 2.0.1

### Patch Changes

- [#31](https://github.com/kjfsm/musescore-linter-plugin/pull/31) [`bc440c9`](https://github.com/kjfsm/musescore-linter-plugin/commit/bc440c9d9d8e9340e8fe5ac7bdac44d1c5697ea0) Thanks [@kjfsm](https://github.com/kjfsm)! - Biome を導入し、release.js を廃止してリリースフローを簡略化

  - `@biomejs/biome` を追加してコード品質チェック・フォーマットを統一
  - CI に `lint` ジョブを追加（`pnpm lint` で Biome チェックを実行）
  - `scripts/release.js` を廃止し、ZIP 作成・GitHub Release 作成を `release.yml` のシェルステップにインライン化
  - `stdio: "inherit"` 時の `execSync` が `null` を返してクラッシュするバグを修正（release.js 廃止により解消）
  - GitHub Actions の Node.js 20 非推奨警告に対応（`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`）

- [#41](https://github.com/kjfsm/musescore-linter-plugin/pull/41) [`2e7674a`](https://github.com/kjfsm/musescore-linter-plugin/commit/2e7674ab864d048b5f17a161f833149a808bda52) Thanks [@kjfsm](https://github.com/kjfsm)! - MuseScore API 型定義を @kjfsm/musescore-plugin-sdk-types へ移行。
  手書き型 (MsScore 等) を公式 C++ ヘッダー由来の外部パッケージ型に置き換えた。

- [#37](https://github.com/kjfsm/musescore-linter-plugin/pull/37) [`d7139a4`](https://github.com/kjfsm/musescore-linter-plugin/commit/d7139a49c4f255a2c24fab16b5529d1fc5f53c44) Thanks [@kjfsm](https://github.com/kjfsm)! - 開発依存パッケージを最新バージョンに更新（TypeScript 6、vitest 4、turbo 2.9 等）
