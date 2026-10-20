# @kjfsm/musescore-plugin-sdk-helpers

## 5.0.0

### Patch Changes

- Updated dependencies [[`66c7b9a`](https://github.com/kjfsm/musescore-plugin-sdk/commit/66c7b9a89d5982e271bf028d312265e4369c1a85)]:
  - @kjfsm/musescore-plugin-sdk-types@2.1.0

## 4.0.0

### Major Changes

- [#42](https://github.com/kjfsm/musescore-plugin-sdk/pull/42) [`144a146`](https://github.com/kjfsm/musescore-plugin-sdk/commit/144a146c2b581c3adc175fbe9393d8ea505a8a77) Thanks [@kjfsm](https://github.com/kjfsm)! - 生成 enum を「値を持たない型のみ」にし、enum の版差誤判定を型レベルで不可能にした。

  **types（major・破壊的変更）**

  - `enums.ts` は `export const <Enum> = { ... } as const` を出力しなくなった。各 enum は
    `export type <Enum>Name = "A" | "B" | ...`（メンバ名のユニオン）と、ブランド化された
    `export type <Enum> = EnumValue<"<Enum>">`（`number & { readonly __enum: Tag }`）のみになる。
    `<Enum>.MEMBER` のような値使用はコンパイルエラーになり、異なる enum 同士の値比較
    （例: `el.type === host.NoteType.NORMAL`）もブランド不一致で型エラーになる。
  - `RuntimeEnum<T>` を `RuntimeEnum<Name extends string, Value>` に変更（`host.Element` 等の
    ホストプロパティの型）。`ElementEnum` / `NoteTypeEnum` / `BarLineTypeEnum` はこの新しい
    `RuntimeEnum` を使うよう更新（公開シグネチャ自体は不変）。

  **helpers（major・破壊的変更）**

  - `classifyBarlineKind` のシグネチャを `(type: BarLineType) => BarlineKind` から
    `(type: BarLineType, barLineType: BarLineTypeEnum) => BarlineKind` に変更。焼き込んだ
    `BarLineType.END` 等の比較が types 側の変更でコンパイル不能になったための対応。
    `barLineType` にはホストの実行時 enum（例: `host.BarLineType`）を渡す。

  この変更は MuseScore のバージョン追従（`generatedFrom.tag` は据え置き）ではなく、型安全性強化に
  伴う API 形状の破壊的変更のため、releasing.md の「MuseScore バージョンを跨がない破壊的変更」の
  例外に該当する。major 番号は MuseScore の minor 対応表とはズレる。

### Patch Changes

- Updated dependencies [[`144a146`](https://github.com/kjfsm/musescore-plugin-sdk/commit/144a146c2b581c3adc175fbe9393d8ea505a8a77)]:
  - @kjfsm/musescore-plugin-sdk-types@2.0.0

## 3.0.0

### Major Changes

- [#40](https://github.com/kjfsm/musescore-plugin-sdk/pull/40) [`1b98f27`](https://github.com/kjfsm/musescore-plugin-sdk/commit/1b98f2755b0b0c766348793083e2a50ff2c890c5) Thanks [@kjfsm](https://github.com/kjfsm)! - MuseScore のホストオブジェクトを型付きの単一コンテキストとして扱えるようにした。enum 値は
  ビルド時に焼き込まず、実行中の MuseScore から解決する方針へ全面的に移行。

  **types（minor・後方互換）**

  - `qmlpluginapi.h` を型生成に追加し、ホスト型 `MuseScore`（PluginAPI）を自動生成。`curScore`・
    `scores`・`mscoreMajorVersion` 等のバージョン情報・約 80 個の実行時 enum（`Element` /
    `NoteType` / `BarLineType` ...）・`cmd` / `newElement` / `writeScore` / `quit` 等の
    メソッドを含む。enum プロパティは `DECLARE_API_ENUM` から `RuntimeEnum<typeof Enum>` 型で
    生成され、値は実行時に解決・キーは生成 enum で型チェックされる。
  - `generatedFrom`（生成元 MuseScore バージョン）を公開 export に追加。
  - `RuntimeEnum<T>` / `ElementEnum` / `NoteTypeEnum` / `BarLineTypeEnum` と各 `*Name` 型を追加。

  **helpers（major・破壊的変更）**

  - `definePlugin({ run(host) {...} })` を追加。QML から `Logic.run(mscore)` のように
    `MuseScore { }` オブジェクト自身を渡し、`host.curScore` / `host.Element` 等へ型付きでアクセス
    できる。実行時にバージョン照合（既定は警告）を行う。
  - `assertHostVersion(host, mode)` を追加。`generatedFrom` のターゲット版と実行版の major/minor を
    突き合わせ、不一致なら throw / warn。`strictEnum(name, obj)` で存在しない enum メンバアクセスを
    例外化できる（任意）。
  - `getNoteTypeName` / `isGraceNote` / `isGraceNoteBefore` / `isGraceNoteAfter` に実行時 `NoteType`
    引数を追加（破壊的）。`element-types.ts` は焼き込んだ `ElementType` 値への依存を排除（実行時は
    `el.name` 文字列で判定）。述語（`isDynamic` 等）の公開シグネチャは不変。

### Patch Changes

- Updated dependencies [[`1b98f27`](https://github.com/kjfsm/musescore-plugin-sdk/commit/1b98f2755b0b0c766348793083e2a50ff2c890c5), [`1b98f27`](https://github.com/kjfsm/musescore-plugin-sdk/commit/1b98f2755b0b0c766348793083e2a50ff2c890c5)]:
  - @kjfsm/musescore-plugin-sdk-types@1.1.0

## 2.2.0

### Minor Changes

- [#38](https://github.com/kjfsm/musescore-plugin-sdk/pull/38) [`17e49c5`](https://github.com/kjfsm/musescore-plugin-sdk/commit/17e49c50ecc8e03a4dff995f172120633c8c41cd) Thanks [@kjfsm](https://github.com/kjfsm)! - 記譜解析向けのアクセサ helper を追加し、`classifyBarlineKind` のリピート分類を細分化しました。

  - `getNotePitches(chord)` — 和音内の各音符の MIDI 音高（0-127）を配列で返す。
  - `getNoteSpellings(chord)` — 各音符の MIDI 音高・TPC（綴り）・譜表位置(line)・臨時記号表示の有無を返す（親切臨時記号の判定向け）。
  - `isTie(el)` / `getTiePitches(tie)` — タイの型ガードと、両端ノートの MIDI 音高取得（端点が欠落/無音程なら `null`）。正しいタイは `startPitch === endPitch`。
  - **`classifyBarlineKind` の挙動変更**: これまで START/END/END_START の各リピートをすべて `"repeat"` に丸めていたが、`"repeat_start"` / `"repeat_end"` / `"repeat_both"` に区別するようにした。`BarlineKind` 型から `"repeat"` を削除。リピート開始/終了の対応チェックを可能にするための変更。

## 2.1.0

### Minor Changes

- [#36](https://github.com/kjfsm/musescore-plugin-sdk/pull/36) [`fb5732b`](https://github.com/kjfsm/musescore-plugin-sdk/commit/fb5732b343c376009b5fedb542781a8eb7efab45) Thanks [@kjfsm](https://github.com/kjfsm)! - スパナ／アーティキュレーション系ヘルパを追加しました。

  - `isSlur(el)` — スラー（`Spanner`）の述語（`el.name === "Slur"`）。
  - `getSpannerRange(spanner)` — 任意のスパナの tick 範囲 `{ startTick, endTick }` を返す（`getHairpinRange` を一般化）。`getHairpinRange` はこれに委譲する薄いラッパになり、挙動は不変。`HairpinRange` は `SpannerRange` の別名。
  - `getArticulationNames(chord)` — 和音に付いたアーティキュレーション名（`subtypeName()`、例: `"Staccato"`）の配列を返す。

  MuseScore のバージョン対応は変更ありません（4.7）。

## 2.0.0

### Patch Changes

- [#26](https://github.com/kjfsm/musescore-plugin-sdk/pull/26) [`365117b`](https://github.com/kjfsm/musescore-plugin-sdk/commit/365117b731489ea0cd3fdc5e99c833eaf634fdee) Thanks [@kjfsm](https://github.com/kjfsm)! - 開発依存パッケージを最新バージョンに更新（Biome 2、TypeScript 6、Vitest 4）。

- Updated dependencies [[`6eaa696`](https://github.com/kjfsm/musescore-plugin-sdk/commit/6eaa696a06d26f7084db75bc865d22d9c38f97cf), [`365117b`](https://github.com/kjfsm/musescore-plugin-sdk/commit/365117b731489ea0cd3fdc5e99c833eaf634fdee)]:
  - @kjfsm/musescore-plugin-sdk-types@1.0.0

## 1.0.3

### Patch Changes

- [#23](https://github.com/kjfsm/musescore-plugin-sdk/pull/23) [`eae7cf7`](https://github.com/kjfsm/musescore-plugin-sdk/commit/eae7cf72432acc1a3ed9aed5be0b455b12b03bef) Thanks [@kjfsm](https://github.com/kjfsm)! - Add hairpin utilities: `Hairpin` interface, `isHairpin` predicate, and `getHairpinRange` helper.

## 1.0.2

### Patch Changes

- [#21](https://github.com/kjfsm/musescore-plugin-sdk/pull/21) [`52b4b0c`](https://github.com/kjfsm/musescore-plugin-sdk/commit/52b4b0c0a2f87717dd69461ddc434184c1032d2c) Thanks [@kjfsm](https://github.com/kjfsm)! - Add `isExpression`, `classifyBarlineKind`, `VOICES_PER_STAFF`; tighten enum types

  **New exports**

  - `isExpression(el)` — type guard for `ElementType.EXPRESSION` (type 42). Previously this element type had no dedicated predicate and would fall through to unknown in annotation classifiers.
  - `classifyBarlineKind(type: BarLineType): BarlineKind` — classifies a `BarLineType` value into `"final" | "double" | "repeat" | "other"`. Implemented with an exhaustive switch + `assertNever` so TypeScript will error if `BarLineType` gains new values without a corresponding case.
  - `BarlineKind` — type alias for the classification result.
  - `VOICES_PER_STAFF` — exports the `4` constant used internally for track ↔ staff index arithmetic.

  **Internal improvements**

  - Element-type predicates (`isDynamic`, `isTempo`, etc.) are now generated by a `makeIs()` factory backed by a `ELEMENT_TYPE_NAMES` map typed with `satisfies Record<PredicateElementType, ...>`. Adding a new predicate-worthy `ElementType` value to the union forces a corresponding map entry at compile time.
  - `resolveMode` in traversal uses a switch with `assertNever` so the `scope` union is exhaustively checked.
  - Magic number `4` (voices per staff) replaced with `VOICES_PER_STAFF` throughout `element-types`, `selection`, and `traversal`.
  - Grace note bitmasks hoisted to module-level constants in `note-type`.

  **Breaking change**

  `getMeasureEndBarlineType` now returns `BarLineType | null` instead of `BarLineType | -1`. Update callers from `!== -1` to `!= null`.

## 1.0.1

### Patch Changes

- [`c95ba11`](https://github.com/kjfsm/musescore-plugin-sdk/commit/c95ba11142153800ce691662df14d3267409c4b7) Thanks [@kjfsm](https://github.com/kjfsm)! - Update README to document all exported modules: `annotations`, `tracks`, `note-type`, `element-types`, and functions added since the initial release (`iterateMeasureSegments`, `iterateStaves`, `getNoteTypeName`, `isGraceNote*`, element-type guards and accessors, etc.).

## 1.0.0

### Major Changes

- [#17](https://github.com/kjfsm/musescore-plugin-sdk/pull/17) [`10a0e78`](https://github.com/kjfsm/musescore-plugin-sdk/commit/10a0e78d2f2654445df9796c956e6c44bef29b4d) Thanks [@kjfsm](https://github.com/kjfsm)! - **Breaking changes**

  - Removed exported types `TempoElement` and `TimeSigElement` (workarounds that are no longer needed now that the generated types cover `EngravingItem.tempo` and `Measure.timesigNominal/timesigActual`)
  - `getTempoBpm` parameter changed from `TempoElement` to `EngravingItem` — callers that stored a `TempoElement`-typed variable should change the annotation to `EngravingItem`
  - `isTempo` return type changed from `el is TempoElement` to `el is EngravingItem` for the same reason
  - `isTimeSig` return type changed from `el is TimeSigElement` to `el is EngravingItem`
  - `getMeasureTimeSig` internal cast removed; function signature and behaviour are unchanged
  - `jumpToElement` parameter type widened from `EngravingItem | null` to `ScoreElement | null` (needed because `Measure.visible` is now a method, making `Measure` structurally incompatible with `EngravingItem`)

  **New exports**

  - `getMeasureEndBarlineType(measure)` — reads `barlineType` from the last BarLine element in a measure
  - `getMeasureRepeatInfo(measure)` — returns `{ repeatStart, repeatEnd, repeatCount }`
  - `getKeySigAt(segment, staffIdx)` — reads `actualKey` from a KeySig element at that segment
  - `getClefTypeAt(segment, staffIdx)` — reads `concertClefType` from a Clef element at that segment
  - `isBarLine(el)`, `isKeySig(el)`, `isClef(el)` — element-name predicates
  - `MeasureRepeatInfo` interface

### Patch Changes

- Updated dependencies [[`10a0e78`](https://github.com/kjfsm/musescore-plugin-sdk/commit/10a0e78d2f2654445df9796c956e6c44bef29b4d)]:
  - @kjfsm/musescore-plugin-sdk-types@0.1.0

## 0.1.0

### Minor Changes

- [#14](https://github.com/kjfsm/musescore-plugin-sdk/pull/14) [`362721b`](https://github.com/kjfsm/musescore-plugin-sdk/commit/362721b019c269fbde096dc9be1cbdb3852ded61) Thanks [@kjfsm](https://github.com/kjfsm)! - Add `iterateMeasureSegments`, `iterateStaves`, `trackToStaffIdx`, `staffVoiceToTrack`, `getAnnotationText`, and `getAnnotationStaffIdx` helpers.

  - `iterateMeasureSegments(measure, segmentTypes?)` — iterate segments within a single measure, filling the gap where `iterateSegments(score)` is too coarse
  - `iterateStaves(score)` — yield each `staffIdx` from `0` to `nstaves - 1`
  - `trackToStaffIdx(track)` / `staffVoiceToTrack(staffIdx, voice)` — remove the `staffIdx * 4 + voice` / `Math.floor(track / 4)` magic numbers that appear throughout plugin code
  - `getAnnotationText(ann)` — return annotation text with HTML stripped and whitespace trimmed, falling back from `plainText` to `text`
  - `getAnnotationStaffIdx(ann)` — resolve `track → staffIdx`, returning `-1` for global (score-wide) annotations

## 0.0.2

### Patch Changes

- [#9](https://github.com/kjfsm/musescore-plugin-sdk/pull/9) [`d371c6a`](https://github.com/kjfsm/musescore-plugin-sdk/commit/d371c6a88558f59c50a49d990deadb62bf4eb4ae) Thanks [@kjfsm](https://github.com/kjfsm)! - Add `@kjfsm/musescore-plugin-sdk-helpers`, a runtime helpers package for MuseScore 4 plugins. Provides traversal generators (`iterateNotes`, `iterateChords`, `iterateMeasures`, `iterateSegments`, `iterateAnnotations`), element predicates (`isChord` / `isNote` / `isRest`), selection helpers (`hasRangeSelection`, `getSelectedElements`, `getSelectionRange`), navigation (`findMeasureByIndex`, `findSegmentByTick`, `jumpToElement`, `jumpToMeasure`), an empty-string-safe `getMetaTag`, and a `withCmd` wrapper around `Score.startCmd` / `endCmd`.
