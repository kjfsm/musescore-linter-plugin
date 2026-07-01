# @musescore-linter/checkers

## 2.2.0

### Minor Changes

- [#86](https://github.com/kjfsm/musescore-linter-plugin/pull/86) [`e67f280`](https://github.com/kjfsm/musescore-linter-plugin/commit/e67f280cbc93ecb6e7735d66e1c32951eb83875e) Thanks [@kjfsm](https://github.com/kjfsm)! - 新規 Checker を 3 つ追加（現行 LintIR のみで実装、SDK 拡張不要）:

  - **spanner-on-rest**（warning）: ヘアピン(cresc./dim.)やスラーの端点が休符上にある箇所を検出。同 tick に音符があれば許容。
  - **slur-single-note**（info）: スラーが単一音（開始 tick == 終了 tick）に掛かっている箇所を検出。
  - **cresc-text-resolution**（info）: テキスト式 cresc./dim. の後に到達先の強弱記号が現れない箇所を検出。

### Patch Changes

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

- Updated dependencies [[`df33366`](https://github.com/kjfsm/musescore-linter-plugin/commit/df33366ec561d2f51a8533e03922b66fcfa585d1), [`df33366`](https://github.com/kjfsm/musescore-linter-plugin/commit/df33366ec561d2f51a8533e03922b66fcfa585d1)]:
  - @musescore-linter/core@2.2.0

## 2.1.2

### Patch Changes

- [`729b26f`](https://github.com/kjfsm/musescore-linter-plugin/commit/729b26f719a25cb762b11bd3585111deea2964e8) Thanks [@kjfsm](https://github.com/kjfsm)! - ヘアピンがある区間の重複ダイナミクスを誤検出しないよう修正

- Updated dependencies [[`729b26f`](https://github.com/kjfsm/musescore-linter-plugin/commit/729b26f719a25cb762b11bd3585111deea2964e8)]:
  - @musescore-linter/core@2.1.4

## 2.1.1

### Patch Changes

- c69f6a5: 重複ダイナミクスチェッカー: 間にヘアピン（クレッシェンド/デクレッシェンド）がある場合は重複判定しないよう修正
- Updated dependencies [c69f6a5]
  - @musescore-linter/core@2.1.3

## 2.1.0

### Minor Changes

- [#60](https://github.com/kjfsm/musescore-linter-plugin/pull/60) [`f948ced`](https://github.com/kjfsm/musescore-linter-plugin/commit/f948ceda7bec23b364aedce4b1babd0695ae97cf) Thanks [@kjfsm](https://github.com/kjfsm)! - 新規チェッカー 3 件追加・coda-segno 整合性チェック追加・テスト強化・エクスポート機能拡充

  **新規チェッカー（テキストペア型）**

  - `sul-tasto-ord`: Sul tasto → Ord. の対応漏れを検知（warning）
  - `sul-pont-ord`: Sul pont. → Ord. の対応漏れを検知（warning）
  - `con-legno-arco`: Con legno → Arco の対応漏れを検知（warning）

  **新規チェッカー（独立型）**

  - `coda-segno`: D.S./D.C. と Segno・Coda マークの対応関係を確認。参照先マークの欠落を検知（error）

  **テスト強化**

  - `rest-annotation`: 複数スタッフ・音符位置の追加ケース
  - `tempo-barline`: 同テンポ値スキップ・複数テンポ変更の追加ケース
  - `sul-tasto-ord`, `sul-pont-ord`, `con-legno-arco`: 各 3 件
  - `coda-segno`: 5 件
  - `irBuilder.quintetIR()`: 弦楽五重奏 5 スタッフの clean fixture ヘルパーを追加
  - `enabledRules`: 複数ルール同時 off のケースを追加
  - 計 59 テストケース（+13）

  **UI: エクスポート形式の拡充**

  - コピーボタンをドロップダウンメニューに変更
  - テキスト形式・Markdown テーブル形式・CSV 形式の 3 種類から選択可能に

  **内部改善**

  - `registerAll()` の `registeredOnce` フラグを削除し、毎回 `reset()` + 全登録する設計に変更（テスト時の registry 状態リークを修正）

### Patch Changes

- Updated dependencies [[`1e9cc57`](https://github.com/kjfsm/musescore-linter-plugin/commit/1e9cc57bdcd871ca8870725f8e406210f9e43e77)]:
  - @musescore-linter/core@2.1.2

## 2.0.2

### Patch Changes

- Updated dependencies [[`bf66404`](https://github.com/kjfsm/musescore-linter-plugin/commit/bf66404524c97a417d997c969c9a9fb5aa76ba78)]:
  - @musescore-linter/core@2.1.1

## 2.0.1

### Patch Changes

- Updated dependencies [[`43902ef`](https://github.com/kjfsm/musescore-linter-plugin/commit/43902ef2e2d33e22841f4e5ffe538f2d503d136d), [`50ef241`](https://github.com/kjfsm/musescore-linter-plugin/commit/50ef24170bd9abb91b69ca3b60154d7c63f16ee8), [`dfb2cec`](https://github.com/kjfsm/musescore-linter-plugin/commit/dfb2cec5646545bbc23422e2dc7cfd470d774b8e)]:
  - @musescore-linter/core@2.1.0
