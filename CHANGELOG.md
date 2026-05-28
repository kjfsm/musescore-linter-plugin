# musescore-linter-plugin

## 2.1.7

### Patch Changes

- [#68](https://github.com/kjfsm/musescore-linter-plugin/pull/68) [`3070002`](https://github.com/kjfsm/musescore-linter-plugin/commit/307000218eba8a74a122b5c9c5c2a52543173393) Thanks [@kjfsm](https://github.com/kjfsm)! - 開発依存パッケージを最新バージョンに更新（Biome 2、TypeScript 6、Vitest 4）。

## 2.1.6

### Patch Changes

- [#66](https://github.com/kjfsm/musescore-linter-plugin/pull/66) [`4e0678d`](https://github.com/kjfsm/musescore-linter-plugin/commit/4e0678d71477353f859bb7201fe0993e16f6e061) Thanks [@kjfsm](https://github.com/kjfsm)! - 最新版 ZIP の固定ダウンロード URL を提供するため、リリースに `musescore-linter-plugin.zip` を追加します。

## 2.1.5

### Patch Changes

- [`729b26f`](https://github.com/kjfsm/musescore-linter-plugin/commit/729b26f719a25cb762b11bd3585111deea2964e8) Thanks [@kjfsm](https://github.com/kjfsm)! - ヘアピンがある区間の重複ダイナミクスを誤検出しないよう修正

## 2.1.4

### Patch Changes

- [#62](https://github.com/kjfsm/musescore-linter-plugin/pull/62) [`858190b`](https://github.com/kjfsm/musescore-linter-plugin/commit/858190bc6bff09ced52368986a40ae97c1a6ebf8) Thanks [@kjfsm](https://github.com/kjfsm)! - チェッカー判定条件の修正

  - **restAnnotationChecker**: 休符上の演奏技法テキスト（pizz./arco/con sord. 等）も不受理として検出するよう拡張。これまで DYNAMIC（強弱記号）のみを検出していたが、description に記載のとおり STAFF_TEXT 内の技法指示も対象に加えた。
  - **codaSegnoChecker**: "D.C./D.S. al Fine" がある場合に Fine マークの存在を確認するチェックを追加。description に記載されていた Fine 対応が未実装だった。
  - **openingTempoChecker**: 手動の CHORD/REST 全走査を `ir.meta.firstMusicTickByStaff` の参照に置き換えて簡素化。

- [#62](https://github.com/kjfsm/musescore-linter-plugin/pull/62) [`858190b`](https://github.com/kjfsm/musescore-linter-plugin/commit/858190bc6bff09ced52368986a40ae97c1a6ebf8) Thanks [@kjfsm](https://github.com/kjfsm)! - textPairChecker: on 状態未経験の off 指示を誤検出しないよう修正

  "arco" や "ord." は複数チェッカー（sul-tasto-ord / sul-pont-ord / con-legno-arco）の offPatterns に共通して含まれている。pizz.→arco のように別の技法を解除する目的で "arco" を書いた場合、これらのチェッカーが「arco が既に指示済みの状態で再度指示されています」と誤検出していた。

  on 状態を一度も経験していないパートに対しては off 指示の重複を報告しないよう `hasEverBeenOn` フラグを追加。

## 2.1.3

### Patch Changes

- [#61](https://github.com/kjfsm/musescore-linter-plugin/pull/61) [`efd562f`](https://github.com/kjfsm/musescore-linter-plugin/commit/efd562fe3d9eab206e16edcb46b6d0453a82dbc5) Thanks [@kjfsm](https://github.com/kjfsm)! - ビルドシステムとリリーススクリプトを整理

  - `scripts/package.ts` を追加: `pnpm run package` で配布用 ZIP をローカル生成できるようになった
  - ZIP 構造を改善: `musescore-linter/` サブフォルダにビルド済みファイルのみをまとめる形式に変更（重複ファイルや存在しないインストーラースクリプトへの参照を除去）
  - `release.yml` のインラインシェル ZIP 作成を `pnpm run package` 呼び出しに置き換え

- [`46a3d9d`](https://github.com/kjfsm/musescore-linter-plugin/commit/46a3d9dc492d9635ecc3241de86b6a29ee946ec6) Thanks [@kjfsm](https://github.com/kjfsm)! - fix

## 2.1.2

### Patch Changes

- [`b0d577b`](https://github.com/kjfsm/musescore-linter-plugin/commit/b0d577b998e657fd98f4f38c6eba822f1490c8ee) Thanks [@kjfsm](https://github.com/kjfsm)! - バグ修正

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
