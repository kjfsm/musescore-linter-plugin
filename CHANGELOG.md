# musescore-linter-plugin

## 2.1.1

### Patch Changes

- [#49](https://github.com/kjfsm/musescore-linter-plugin/pull/49) [`d11b5fb`](https://github.com/kjfsm/musescore-linter-plugin/commit/d11b5fb842dafa2e5d68655a39aa84e50090bdc8) Thanks [@kjfsm](https://github.com/kjfsm)! - Qt.labs.settings を QtObject に置き換え、MuseScore 4 での起動エラーを修正

  MuseScore 4 の QML 環境では `Qt.labs.settings` モジュールが利用できないため、
  プラグインロード時に "module is not installed" エラーが発生していた。
  `Settings { }` を `QtObject { }` に変更してインメモリ保持に切り替えることで修正。
  セッション間でのルール設定の永続化はなくなるが、プラグインが正常に起動・動作するようになる。

## 2.1.0

### Minor Changes

- [#46](https://github.com/kjfsm/musescore-linter-plugin/pull/46) [`7f0147d`](https://github.com/kjfsm/musescore-linter-plugin/commit/7f0147d14a721fe7e868c32457dfac4d01af9ba1) Thanks [@kjfsm](https://github.com/kjfsm)! - 新しいチェッカー 3 件を追加し、型情報の活用基盤を強化

  - **BPM 値なしテンポ** (`tempo-without-bpm`, warning): テンポ表記に BPM 値が未設定のものを検出。`LintEvent.tempo` 値を直接参照することで精度を確保。
  - **重複ダイナミクス** (`duplicate-dynamics`, info): 同パートで同じ強弱記号が変化なく連続する箇所を検出。`LintEvent.subtype` を優先比較し、textNorm をフォールバックとして使用。
  - **終止線の確認** (`final-barline`, info): 曲末の最終 barline が終止線（final barline）になっているかを確認。

  あわせて `barlineKind` に `FINAL` を追加（MuseScore 4 の `BarLineType.END` に対応、生値 32 によるフォールバック付き）。

### Patch Changes

- [#47](https://github.com/kjfsm/musescore-linter-plugin/pull/47) [`8b051a8`](https://github.com/kjfsm/musescore-linter-plugin/commit/8b051a87d6fa970d37f1f890d95b164fb82d7b6f) Thanks [@kjfsm](https://github.com/kjfsm)! - feat: Windows 用プラグインインストーラーを追加

  リリース ZIP に `Plugin-installer.bat` と `Plugin-installer.ps1` を同梱。
  展開後に `.bat` をダブルクリックすると、MuseScore 4 のプラグインディレクトリを自動探索して確認ダイアログを経由してコピーする。

- [#44](https://github.com/kjfsm/musescore-linter-plugin/pull/44) [`14e7d87`](https://github.com/kjfsm/musescore-linter-plugin/commit/14e7d87ff9d05c0dc4b41497accb3471d857944b) Thanks [@kjfsm](https://github.com/kjfsm)! - fix: リリース ZIP に dist/bundle.js を含めるよう修正

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
