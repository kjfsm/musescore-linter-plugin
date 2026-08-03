# @musescore-linter/core

## 2.5.0

### Minor Changes

- [#110](https://github.com/kjfsm/musescore-linter-plugin/pull/110) [`25271ee`](https://github.com/kjfsm/musescore-linter-plugin/commit/25271ee5aa7ac2352f2dbc4a022659412d957597) Thanks [@kjfsm](https://github.com/kjfsm)! - 同リズム間のスラー/タイ/アーティキュレーション整合の判定範囲を、スコアの括弧（システムブラケット）で絞れるようにした

  オーケストラスコアでは「Fl 1 と Vc がたまたま同リズム」といった無関係な組み合わせまで比較されてノイズになっていた。比較範囲を「全パート」「括弧内のみ」で切り替えられるようにし、区切りに使う括弧の種類（角括弧 / 括弧 / 大括弧 / 縦線）も選べるようにした。譜表を覆う最小の括弧が採用されるので、角括弧だけを選べば「木管全体」、括弧も選べば「Fl 1st/2nd のペア」単位で比較される。

  既定は今までどおり全パート比較なので、明示的に設定しない限り検出結果は変わらない。選んだ種類の括弧がスコアに 1 つも無い場合も全パート比較にフォールバックする。

  あわせて次の基盤を追加した。

  - `LintIR` の `meta.partGroups`（MusicXML の `<part-group>` と MuseScore の `Staff.brackets` の両方から構築）
  - checker が ON/OFF 以外の設定を受け取るための汎用オプション機構（`Checker.options` 宣言と `run(ir, options)`）。設定 UI は宣言から自動生成され、CLI では `--rule-option=<id>.<key>=<値>` で指定できる

  なお `brace`（大譜表）は MuseScore プラグイン経路でのみ有効。MusicXML では大譜表が `<part-group>` ではなく `<staves>` で暗黙表現されるため、Web 版と CLI では括弧として認識されない。

## 2.4.0

### Minor Changes

- [#105](https://github.com/kjfsm/musescore-linter-plugin/pull/105) [`eb72e66`](https://github.com/kjfsm/musescore-linter-plugin/commit/eb72e666a6311a73b59c5db02697be1ce75e559b) Thanks [@kjfsm](https://github.com/kjfsm)! - 拍境界をまたぐ音符を検出する Checker を追加:

  - **beat-crossing-tie**（info / 主要境界またぎは warning）: 拍の骨格を隠す音符（イマジナリーバーライン違反）を検出し、タイでの分割案をメッセージに載せる。

  判定は境界の強さの順に 3 段構え:

  - **小節線**をまたぐ音符は例外なく分割必須（warning）。ただし MuseScore / MusicXML では 1 つの音符が小節線を越えられない（タイ 2 音で表現される）ので、実際に発火するのは破損小節など異常データのときだけ。

  - **主要境界（偶数拍子の小節中央）をまたぐ音符**は、小節の頭から始まっているものだけを例外とし、それ以外は拍頭始まりでも分割必須（warning）。例: 4/4 の 2 拍目からの付点 4 分音符 → 「4 分音符+8 分音符のタイ」。小節頭からの 2 分音符・付点 2 分音符・全音符は許容する。奇数拍子（3/4・9/8）には中央が無いのでこの規則を適用しない（3/4 の「4 分+2 分」は標準的な記譜のため）。
  - **通常の拍境界**は、拍の途中から始まる音符がまたぐ場合に分割推奨（info）。例: 4/4 の「付点 8 分+付点 8 分+8 分」の 2 つ目 → 「16 分音符+8 分音符のタイ」。

  対象は単純拍子（分子 2・3・4）と複合拍子（分子 6・9・12）のみ。加算拍子・アウフタクト・連符は判定対象外として黙ってスキップする。診断メッセージには開始位置（「2 拍目裏」「1 拍目+付点 8 分音符」）とまたいだ拍境界を入れ、同じ小節に同じ音価の違反が並んでも区別できるようにしてある。

  前提として LintIR に小節の枠組みを追加:

  - `meta.measures[]`（`MeasureInfo` = 小節番号 / 先頭 tick / 小節長 / 拍子 n・m）を新設。MuseScore 経路は helpers の `getMeasureTimeSig`、MusicXML 経路は `<attributes><time>` から配線した（`<time>` は次の変更まで持ち回る）。拍子が取れない小節は配列に載らないので、参照側は「無ければ判定しない」で済む。
  - `LintEvent.tuplet`（chord/rest が連符ブラケット内か）を追加。MuseScore 経路は SDK の `DurationElement.tuplet`、MusicXML 経路は `<time-modification>` の有無から配線した。音価の分母だけでは 4:3 のように分母が 2 の冪になる連符を見分けられないため、フラグが要る。
  - tick 分解能定数 `TICKS_PER_QUARTER` / `TICKS_PER_WHOLE` を core へ移設。`@musescore-linter/source-musicxml` の `TICKS_PER_QUARTER` は core からの再輸出になり、値・公開 API とも変更なし。

## 2.3.0

### Minor Changes

- [#93](https://github.com/kjfsm/musescore-linter-plugin/pull/93) [`5aceec2`](https://github.com/kjfsm/musescore-linter-plugin/commit/5aceec27240146f1f12ba6cca996b5918ca760bd) Thanks [@kjfsm](https://github.com/kjfsm)! - `articulation-slur-consistency` チェッカーを `slur-tie-articulation-consistency` にリネームし、タイの被覆比較を追加。

  - ルール名を「同リズム間のスラー/アーティキュレーション整合」→「同リズム間のスラー/タイ/アーティキュレーション整合」に変更。id も `articulation-slur-consistency` → `slur-tie-articulation-consistency` に変更
  - 同じリズムのパート間でタイの有無が食い違う場合も検出するようになった（`IRDerived.tiesByStaff` / `tieCoversTick` を追加）
  - MuseScore の `subtypeName()` が符尾方向で返す「上スタッカート」「下スタッカート」等の配置違いバリアントを同一視するよう正規化（`normalizeArticulationName`）し、誤検出を修正
  - `rhythmByStaffMeasure` の署名に event kind（chord/rest）を含めるよう修正し、休符と音符を「同じリズム」と誤認していたバグを修正

## 2.2.1

### Patch Changes

- [`597e37b`](https://github.com/kjfsm/musescore-linter-plugin/commit/597e37b40db40ac0f4f4862226c78d1b29f3721e) Thanks [@kjfsm](https://github.com/kjfsm)! - version up

- Updated dependencies [[`597e37b`](https://github.com/kjfsm/musescore-linter-plugin/commit/597e37b40db40ac0f4f4862226c78d1b29f3721e)]:
  - @musescore-linter/musescore-api@1.0.1

## 2.2.0

### Minor Changes

- [#91](https://github.com/kjfsm/musescore-linter-plugin/pull/91) [`df33366`](https://github.com/kjfsm/musescore-linter-plugin/commit/df33366ec561d2f51a8533e03922b66fcfa585d1) Thanks [@kjfsm](https://github.com/kjfsm)! - `buildSnapshot` の呼び出し契約バグを修正し、SDK の版安全ヘルパを活用するようにした。

  **重大バグ修正（`@musescore-linter/core`）**: `ScoreLinter.qml` が `buildSnapshot(curScore, NoteType, BarLineType)` と
  3 引数フラットで呼んでいたが、実際のシグネチャは `(score, hostEnums)` の 2 引数だった。結果 `hostEnums` に
  `NoteType` オブジェクト自体が渡り、`hostEnums.noteType` / `hostEnums.barLineType` が `undefined` になっていた。
  `isGraceNote(chord, undefined)` が各小節の解析で例外を投げ、`buildSnapshot` 内の per-measure `try/catch` が
  握りつぶすため、**スナップショットが実質空になり全 checker が何も検出しない**状態になっていた
  （`[#90](https://github.com/kjfsm/musescore-linter-plugin/issues/90)` で混入・リリース済み）。QML 側の呼び出しを `buildSnapshot(curScore, { noteType, barLineType }, plugin)`
  に修正。

  **SDK の版安全ヘルパを活用**:

  - `buildSnapshot` に第 3 引数 `host?: MuseScore` を追加。渡すと SDK の `checkHostVersion` で型の生成元
    MuseScore バージョンと実行版を照合し、結果を `ir.meta.hostVersion`（`{ ok, generatedTag, running, message? }`）
    に記録する。不一致時は QML 側が警告 issue として結果リストに出す。
  - `hostEnums`（`NoteType`/`BarLineType`）を SDK の `strictEnum` で包み、実行中の版に存在しないメンバへの
    アクセスを「静かな undefined」ではなく例外にする（Proxy 非対応環境ではフォールバック）。

  **内部重複の解消（`@musescore-linter/checkers`）**: 4 checker に重複していた `measureAtTick` と、6 checker に
  重複していた part 名マップ構築を `packages/checkers/src/base/query.ts` の `measureAtTick` / `buildPartNameMap`
  に一本化。挙動は不変。

### Patch Changes

- [#91](https://github.com/kjfsm/musescore-linter-plugin/pull/91) [`df33366`](https://github.com/kjfsm/musescore-linter-plugin/commit/df33366ec561d2f51a8533e03922b66fcfa585d1) Thanks [@kjfsm](https://github.com/kjfsm)! - SDK の enum が「値を持たない型のみ」になる破壊的変更（`@kjfsm/musescore-plugin-sdk-types@2.0.0` / `@kjfsm/musescore-plugin-sdk-helpers@4.0.0`）に追従。`snapshot.ts` にあったローカル回避実装 `classifyBarlineKindRuntime`（SDK 側の焼き込み比較を避けるための重複実装）を削除し、SDK が実行時 enum 対応に更新された `classifyBarlineKind` を直接呼ぶように変更。挙動・出力は不変。

## 2.1.4

### Patch Changes

- [`729b26f`](https://github.com/kjfsm/musescore-linter-plugin/commit/729b26f719a25cb762b11bd3585111deea2964e8) Thanks [@kjfsm](https://github.com/kjfsm)! - ヘアピンがある区間の重複ダイナミクスを誤検出しないよう修正

## 2.1.3

### Patch Changes

- c69f6a5: 重複ダイナミクスチェッカー: 間にヘアピン（クレッシェンド/デクレッシェンド）がある場合は重複判定しないよう修正

## 2.1.2

### Patch Changes

- [#58](https://github.com/kjfsm/musescore-linter-plugin/pull/58) [`1e9cc57`](https://github.com/kjfsm/musescore-linter-plugin/commit/1e9cc57bdcd871ca8870725f8e406210f9e43e77) Thanks [@kjfsm](https://github.com/kjfsm)! - `@kjfsm/musescore-plugin-sdk-helpers` を v0.1.0 → v1.0.1、`@kjfsm/musescore-plugin-sdk-types` を v0.0.2 → v0.1.0 にアップデート。

  SDK の型安全なヘルパー関数（`isChord`、`isRest`、`isBarLine`、`isTempo` 等）を利用するようリファクタリングし、QML 側から enum マップを渡す必要がなくなった。`buildSnapshot` の引数から `MuseScoreEnums` を削除。

## 2.1.1

### Patch Changes

- [#43](https://github.com/kjfsm/musescore-linter-plugin/pull/43) [`bf66404`](https://github.com/kjfsm/musescore-linter-plugin/commit/bf66404524c97a417d997c969c9a9fb5aa76ba78) Thanks [@kjfsm](https://github.com/kjfsm)! - chore: @kjfsm/musescore-plugin-sdk-helpers をインストール

## 2.1.0

### Minor Changes

- [#27](https://github.com/kjfsm/musescore-linter-plugin/pull/27) [`50ef241`](https://github.com/kjfsm/musescore-linter-plugin/commit/50ef24170bd9abb91b69ca3b60154d7c63f16ee8) Thanks [@kjfsm](https://github.com/kjfsm)! - TypeScript + pnpm monorepo への全面移行

  ## 主な変更点

  - **TypeScript 導入**: ビジネスロジック全体を TypeScript で書き直し、型安全性を確保
  - **pnpm workspaces + Turborepo**: `packages/core`・`packages/checkers` の内部モノレポ構成に移行。Turborepo によるビルド依存順序管理とキャッシュで CI を高速化
  - **esbuild バンドル**: `src/bundle-entry.ts` → `dist/bundle.js` のビルドパイプラインを整備。QML の `.pragma library` 制約に対応した IIFE 形式で出力
  - **Vitest 導入**: カスタム vm ベースのテストランナー（`test/loader.js`）を廃止し、TypeScript ネイティブな Vitest に移行
  - **QML UI 全面刷新**: Material Design インスパイアのレイアウトに刷新。severity バッジトグル、カテゴリ別折りたたみ設定、左ボーダーによる severity 強調など
  - **CI/CD 更新**: GitHub Actions ワークフローを pnpm + Turborepo キャッシュ対応に変更

### Patch Changes

- [#28](https://github.com/kjfsm/musescore-linter-plugin/pull/28) [`43902ef`](https://github.com/kjfsm/musescore-linter-plugin/commit/43902ef2e2d33e22841f4e5ffe538f2d503d136d) Thanks [@kjfsm](https://github.com/kjfsm)! - CI ワークフローをさらに強化

  - `ci.yml`: `typecheck` + `test` の並列ジョブに分割（型エラーの早期フィードバック）、`pnpm audit --audit-level=high` による脆弱性チェック追加（GHAS 不要）、`codecov/codecov-action` によるカバレッジ計測・送信追加
  - `vitest.config.ts`: v8 プロバイダーの coverage 設定を追加（lcov レポート生成）
  - `package.json`: `@vitest/coverage-v8` 追加、`test:coverage` スクリプト追加
  - `.gitignore`: `coverage/` を追加
  - `release.yml`: `id-token: write` 追加、`fetch-depth: 0` 追加、Node.js を 24 に更新
  - `codeql.yml` 新規追加: 毎週月曜に JS/TS セキュリティスキャンを実行（GHAS 有効化後に利用可能）

- [#25](https://github.com/kjfsm/musescore-linter-plugin/pull/25) [`dfb2cec`](https://github.com/kjfsm/musescore-linter-plugin/commit/dfb2cec5646545bbc23422e2dc7cfd470d774b8e) Thanks [@kjfsm](https://github.com/kjfsm)! - README と CLAUDE.md に CI・リリースフローのドキュメントを追加
