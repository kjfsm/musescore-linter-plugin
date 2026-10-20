# @musescore-sdk/types

## 2.1.0

### Minor Changes

- [#44](https://github.com/kjfsm/musescore-plugin-sdk/pull/44) [`66c7b9a`](https://github.com/kjfsm/musescore-plugin-sdk/commit/66c7b9a89d5982e271bf028d312265e4369c1a85) Thanks [@kjfsm](https://github.com/kjfsm)! - 実行時 enum オブジェクトの型 `BracketTypeEnum` を追加

  システムブラケット（`Staff.brackets` の各要素が持つ `systemBracket`）は int でしか取得できず、`ElementType` のような名前アクセサも無いため、判定には実行時 enum オブジェクトを QML から受け渡す必要がある。しかし `ElementEnum` / `NoteTypeEnum` / `BarLineTypeEnum` しか用意されておらず、利用側で `RuntimeEnum<BracketTypeName, BracketType>` を合成するしかなかった。

  あわせて `BracketTypeName` も re-export し、`BarLineTypeName` などと同じくパッケージのルートから型名で参照できるようにした。

## 2.0.0

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

## 1.1.0

### Minor Changes

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

- [#40](https://github.com/kjfsm/musescore-plugin-sdk/pull/40) [`1b98f27`](https://github.com/kjfsm/musescore-plugin-sdk/commit/1b98f2755b0b0c766348793083e2a50ff2c890c5) Thanks [@kjfsm](https://github.com/kjfsm)! - MuseScore 4.7.3（v4.7.3 / cf9860c）に追従して型を再生成。`ElementType` をはじめとする enum 値が上流の再採番に合わせて更新されている。

## 1.0.0

### Major Changes

- [#30](https://github.com/kjfsm/musescore-plugin-sdk/pull/30) [`6eaa696`](https://github.com/kjfsm/musescore-plugin-sdk/commit/6eaa696a06d26f7084db75bc865d22d9c38f97cf) Thanks [@kjfsm](https://github.com/kjfsm)! - MuseScore v4.7.2 に対応し、型パッケージを **1.0.0** に到達させます。あわせて「MuseScore 連動メジャー採番」を採用します（**major 1 ⇒ MuseScore 4.7**。以降は MuseScore の minor が上がるごとに型パッケージの major を上げる方針）。MuseScore 4.6 系の型は従来どおり `0.1.x` で利用できます。対応する MuseScore バージョンは `_meta.generatedFrom.tag` を参照してください。

  apiv1 のフラクション・ラッパクラスが `FractionWrapper` から `Fraction` に改名されたため、ジェネレータの既知型マッピングを更新しました。`timesigNominal` / `timesigActual` / `timesig` / `timesigStretch` / `lyricTicks` / `spannerTick` / `spannerTicks` の型が `Fraction | null` になります（メンバーは `numerator` / `denominator` / `ticks` / `str` / `real` 等）。`FractionWrapper` 型名は廃止されました。

  また 4.7 で導入された `API_PROPERTY_ENUM` マクロにジェネレータを対応させ、これまで取りこぼしていた enum プロパティ（`headGroup` / `headType` / `stemDirection` / `slurDirection` / `direction` / `horizontalDirection` / `keysig_mode` / `lineType` / `hideWhenEmpty`）を復活させました。

  その他、4.6 → 4.7 の API 差分（プロパティ・enum の増減、新クラス `Beam` / `Lyrics` など）を反映しています。

### Patch Changes

- [#26](https://github.com/kjfsm/musescore-plugin-sdk/pull/26) [`365117b`](https://github.com/kjfsm/musescore-plugin-sdk/commit/365117b731489ea0cd3fdc5e99c833eaf634fdee) Thanks [@kjfsm](https://github.com/kjfsm)! - 開発依存パッケージを最新バージョンに更新（Biome 2、TypeScript 6、Vitest 4）。

## 0.1.0

### Minor Changes

- [#17](https://github.com/kjfsm/musescore-plugin-sdk/pull/17) [`10a0e78`](https://github.com/kjfsm/musescore-plugin-sdk/commit/10a0e78d2f2654445df9796c956e6c44bef29b4d) Thanks [@kjfsm](https://github.com/kjfsm)! - Expanded generated types to cover ~170 previously missing properties declared via `API_PROPERTY` macros in MuseScore's `elements.h`.

  The types-generator now parses `API_PROPERTY_T(type, name, KEY)`, `API_PROPERTY_READ_ONLY_T(type, name, KEY)`, `API_PROPERTY(name, KEY)`, and `API_PROPERTY_READ_ONLY(name, KEY)` in addition to standard `Q_PROPERTY` declarations.

  Notable additions:

  - `Note`: `pitch`, `tpc1`, `tpc2`, `userVelocity`, `tuning`, `line`, `fret`, `string`
  - `Measure`: `timesigNominal`, `timesigActual`, `repeatCount`, `irregular`, `breakMmr`, `userStretch`
  - `MeasureBase`: `repeatStart`, `repeatEnd`, `repeatJump`, `noOffset`, `irregular`
  - `EngravingItem`: `tempo`, `barlineType`, `barlineSpan`, `dynamicType`, `concertClefType`, `transposingClefType`, `actualKey`, `concertKey`, `velocity`, `direction`, `stemDirection`, `placement`, `text`, `beginText`, `continueText`, `endText`, `lineStyle`, `lineColor`, `lineWidth`, `symbol`, `beamMode`, `dotPosition`, `veloType`, `align`, and 80+ more
  - `Staff`: `staffBarlineSpan`, `staffBarlineSpanFrom`, `staffBarlineSpanTo`, `staffInvisible`, `bracketSpan`, `systemBracket`, `bracketColumn`
  - `Tuplet`: `numberType`, `bracketType`, `actualNotes`, `normalNotes`
  - `ChordRest`: `staffMove`

  Properties with complex C++ struct types (e.g. `PairF`, `CurveFit`, `GroupNodes`, `QPainterPath`) remain typed as `unknown`.

## 0.0.2

### Patch Changes

- [#1](https://github.com/kjfsm/musescore-plugin-sdk/pull/1) [`aa9f309`](https://github.com/kjfsm/musescore-plugin-sdk/commit/aa9f309e6c6614e12a63691c7dbc43a15a7bcb19) Thanks [@kjfsm](https://github.com/kjfsm)! - create sdk
