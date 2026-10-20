# @kjfsm/musescore-plugin-sdk-helpers

MuseScore 4 プラグインで頻出する操作をまとめたランタイムヘルパ集。`@kjfsm/musescore-plugin-sdk-types` の型定義を前提に、Score 走査・選択範囲の取得・要素ジャンプ・`startCmd`/`endCmd` ラッパなどを提供する。

## インストール

```sh
npm install @kjfsm/musescore-plugin-sdk-helpers @kjfsm/musescore-plugin-sdk-types
```

## 使い方

```ts
import {
  definePlugin,
  iterateNotes,
  getSelectionRange,
  withCmd,
  jumpToMeasure,
} from "@kjfsm/musescore-plugin-sdk-helpers";

// QML からは `Logic.run(mscore)` のように MuseScore { } オブジェクト（ホスト）を渡す。
export const run = definePlugin({
  run(host) {
    const score = host.curScore;
    if (!score) return;

    const range = getSelectionRange(score);
    console.log(range ? `selection: ${range.startTick}-${range.endTick}` : "no range");

    withCmd(score, "color first note red", () => {
      for (const note of iterateNotes(score)) {
        // 焼き込んだ定数ではなく、ホストの実行時 enum で判定する
        if (note.type === host.Element.NOTE) {
          // note.color = "#ff0000";
        }
        break;
      }
    });

    jumpToMeasure(score, 0);
  },
});
```

## API リファレンス

### plugin — エントリ定義・ホスト・バージョン照合

```ts
import {
  definePlugin,
  checkHostVersion,
  assertHostVersion,
  strictEnum,
} from "@kjfsm/musescore-plugin-sdk-helpers";
import type { HostVersionCheck, VersionMismatchMode } from "@kjfsm/musescore-plugin-sdk-helpers";
```

QML の `MuseScore { }` オブジェクト（ホスト）を型付きの単一コンテキストとして扱う。enum 値は焼き込まず、ホスト経由で実行時に解決する。

| 関数 / 型 | シグネチャ | 説明 |
| --- | --- | --- |
| `definePlugin` | `({ run, onVersionMismatch? }) → (host: MuseScore) → void` | エントリを定義。QML から `Logic.run(mscore)` でホストを渡す。返り値の関数は起動時にバージョン照合してから `run(host)` を呼ぶ |
| `checkHostVersion` | `(host) → HostVersionCheck` | 型の生成元バージョン（`generatedFrom`）と実行版の major/minor を突き合わせる。Result（`{ ok: true } \| { ok: false; message; want; have }`）を返す |
| `assertHostVersion` | `(host) → void` | バージョン不一致なら例外を投げる（`checkHostVersion` の throw 版） |
| `strictEnum` | `(name, obj) → obj` | enum オブジェクトを `Proxy` で包み、存在しないメンバアクセスを例外化する（任意・厳格モード。Qt6 の ES6 `Proxy` 前提） |
| `VersionMismatchMode` | `"throw" \| "warn" \| "ignore"` | `definePlugin` の `onVersionMismatch`。既定 `"warn"`（`host.log` に出す） |

```ts
export const run = definePlugin({
  // onVersionMismatch: "throw" にすると不一致で例外を投げる（既定は警告）
  run(host) {
    const score = host.curScore;
    if (!score) return;
    for (const note of iterateNotes(score)) {
      if (note.type === host.Element.NOTE) { /* ... */ }
    }
  },
});
```

値の並び替え（同一 minor の patch 差）は実行時 enum が吸収するため照合対象外。検出したいのは「型に存在するメンバ・API が実行版に無い」ような major/minor の不一致。

---

### traversal — Score の走査

```ts
import {
  iterateMeasures,
  iterateSegments,
  iterateMeasureSegments,
  iterateStaves,
  iterateChords,
  iterateNotes,
  iterateAnnotations,
} from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 | シグネチャ | 説明 |
| --- | --- | --- |
| `iterateMeasures` | `(score) → Generator<Measure>` | スコア全体の小節を順に yield する |
| `iterateSegments` | `(score, segmentTypes?) → Generator<Segment>` | スコア全体のセグメントを yield する。`segmentTypes` はビットマスクでフィルタ可能 |
| `iterateMeasureSegments` | `(measure, segmentTypes?) → Generator<Segment>` | 1 つの小節内のセグメントだけを yield する |
| `iterateStaves` | `(score) → Generator<number>` | `0` から `nstaves - 1` までの staffIdx を yield する |
| `iterateChords` | `(score, options?) → Generator<Chord>` | Chord 要素を yield する。`options.scope` で範囲を制御（後述） |
| `iterateNotes` | `(score, options?) → Generator<Note>` | Note 要素を yield する。`options.scope` で範囲を制御（後述） |
| `iterateAnnotations` | `(score) → Generator<EngravingItem>` | 全セグメントのアノテーションを yield する |

#### `IterateScopeOptions`

`iterateChords` / `iterateNotes` の第 2 引数。

| `scope` 値 | 挙動 |
| --- | --- |
| `"auto"` （デフォルト） | 範囲選択があればその範囲、個別選択があればその要素、なければ全スコア |
| `"selection"` | 現在の選択のみ。選択がなければ何も yield しない |
| `"all"` | 選択を無視して全スコアを走査 |

---

### predicates — 要素の型判定

```ts
import { isChord, isNote, isRest } from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 | 戻り型 | 説明 |
| --- | --- | --- |
| `isChord(el)` | `el is Chord` | `el.name === "Chord"` |
| `isNote(el)` | `el is Note` | `el.name === "Note"` |
| `isRest(el)` | `el is ChordRest` | `el.name === "Rest"` |

引数は `ScoreElement | null | undefined` を受け付ける。

---

### element-types — 要素種別の判定と属性の読み取り

```ts
import {
  isTempo, isDynamic, isTimeSig, isBarLine,
  isKeySig, isClef, isStaffText, isSystemText,
  isPlayTechAnnotation, isRehearsalMark,
  getMeasureTimeSig, getMeasureEndBarlineType, getMeasureRepeatInfo,
  getKeySigAt, getClefTypeAt,
  getTempoBpm, parseDynamicText,
} from "@kjfsm/musescore-plugin-sdk-helpers";
```

#### 要素名ガード（`el is EngravingItem`）

| 関数 | `el.name` |
| --- | --- |
| `isTempo(el)` | `"Tempo"` または `"TempoText"` |
| `isDynamic(el)` | `"Dynamic"` |
| `isExpression(el)` | `"Expression"` |
| `isTimeSig(el)` | `"TimeSig"` |
| `isBarLine(el)` | `"BarLine"` |
| `isKeySig(el)` | `"KeySig"` |
| `isClef(el)` | `"Clef"` |
| `isStaffText(el)` | `"StaffText"` |
| `isSystemText(el)` | `"SystemText"` |
| `isPlayTechAnnotation(el)` | `"PlayTechAnnotation"` |
| `isRehearsalMark(el)` | `"RehearsalMark"` |

#### 属性の読み取り

| 関数 | シグネチャ | 説明 |
| --- | --- | --- |
| `getMeasureTimeSig` | `(measure) → string` | 小節の拍子記号を `"4/4"` 形式で返す。取得不可なら空文字 |
| `getMeasureEndBarlineType` | `(measure) → BarLineType \| null` | 小節末尾の BarLine の種類。存在しなければ `null` |
| `getMeasureRepeatInfo` | `(measure) → MeasureRepeatInfo` | `{ repeatStart, repeatEnd, repeatCount }` を返す |
| `getKeySigAt` | `(segment, staffIdx) → Key \| null` | 指定セグメント・スタッフの KeySig から `actualKey`（五度圏値）を読む |
| `getClefTypeAt` | `(segment, staffIdx) → ClefType \| null` | 指定セグメント・スタッフの Clef から `concertClefType` を読む |
| `getTempoBpm` | `(el) → number` | `TempoText.tempo`（拍/秒）を BPM に変換する |
| `parseDynamicText` | `(raw) → string` | SMuFL シンボル名の連結文字列（例: `"dynamicMezzodynamicPiano"`）を `"mp"` 等の略記に変換する |

---

### barline — 小節線の分類

```ts
import { classifyBarlineKind } from "@kjfsm/musescore-plugin-sdk-helpers";
import type { BarlineKind } from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 / 型 | シグネチャ | 説明 |
| --- | --- | --- |
| `classifyBarlineKind` | `(type: BarLineType, barLineType: BarLineTypeEnum) → BarlineKind` | `BarLineType` を意味的なカテゴリに分類する。`barLineType` は `host.BarLineType` のようなホストの実行時 enum オブジェクト |
| `BarlineKind` | `"final" \| "double" \| "repeat_start" \| "repeat_end" \| "repeat_both" \| "other"` | 分類結果の型 |

`BarLineType` の各メンバ名に対する分類:

| `BarLineType` のメンバ名 | `BarlineKind` |
| --- | --- |
| `END`, `REVERSE_END` | `"final"` |
| `DOUBLE` | `"double"` |
| `START_REPEAT` | `"repeat_start"` |
| `END_REPEAT` | `"repeat_end"` |
| `END_START_REPEAT` | `"repeat_both"` |
| `NORMAL`, `BROKEN`, `DOTTED`, `HEAVY`, `DOUBLE_HEAVY` | `"other"` |

生成 enum（`BarLineType`）は値を持たない型のみなので、値の焼き込みはコンパイルエラーになる。分類は `Record<BarLineTypeName, BarlineKind>` で網羅されており、`BarLineType` に新しいメンバが追加され再生成された場合は未割当キーとしてコンパイルエラーになる。

---

### spanner — スパナ（ヘアピン・スラー）の判定と範囲

```ts
import {
  isHairpin,
  isSlur,
  getHairpinRange,
  getSpannerRange,
} from "@kjfsm/musescore-plugin-sdk-helpers";
import type { Hairpin, SpannerRange } from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 / 型 | シグネチャ | 説明 |
| --- | --- | --- |
| `isHairpin(el)` | `el is Hairpin` | `el.name === "Hairpin"`（クレッシェンド/ディミヌエンド） |
| `isSlur(el)` | `el is Spanner` | `el.name === "Slur"` |
| `getSpannerRange(spanner)` | `(spanner) → SpannerRange` | 任意のスパナの tick 範囲 `{ startTick, endTick }`。`spannerTick`（開始）と `spannerTicks`（長さ）から算出。null は 0 扱い |
| `getHairpinRange(hairpin)` | `(hairpin) → SpannerRange` | `getSpannerRange` の別名（ヘアピン向け） |
| `SpannerRange` | `{ startTick, endTick }` | tick 範囲（`HairpinRange` は別名） |

スパナは音符の `spannerForward` / `spannerBack` から得られる。`isHairpin` / `isSlur` で絞り込んでから `getSpannerRange` を呼ぶ。

---

### articulation — アーティキュレーション名の取得

```ts
import { getArticulationNames } from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 | シグネチャ | 説明 |
| --- | --- | --- |
| `getArticulationNames(chord)` | `(chord) → string[]` | 和音に付いたアーティキュレーション名（`subtypeName()`、例: `"Staccato"` `"Accent"`）の配列。無ければ `[]` |

---

### selection — 選択範囲の操作

```ts
import {
  hasRangeSelection,
  getSelectedElements,
  getSelectionRange,
} from "@kjfsm/musescore-plugin-sdk-helpers";
import type { SelectionRange } from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 / 型 | シグネチャ | 説明 |
| --- | --- | --- |
| `hasRangeSelection` | `(score) → boolean` | 現在の選択が範囲選択かどうか |
| `getSelectedElements` | `(score) → EngravingItem[]` | 個別選択されている要素の配列。選択なしなら空配列 |
| `getSelectionRange` | `(score) → SelectionRange \| null` | 範囲選択の tick・track 範囲。範囲選択でなければ `null` |
| `SelectionRange` | `{ startTick, endTick, startTrack, endTrack }` | `endTick` はスコア末尾まで選択されている場合 `Number.MAX_SAFE_INTEGER` |

---

### navigation — スコアビューの移動

```ts
import {
  findMeasureByIndex,
  findSegmentByTick,
  jumpToElement,
  jumpToMeasure,
} from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 | シグネチャ | 説明 |
| --- | --- | --- |
| `findMeasureByIndex` | `(score, index) → Measure \| null` | `Measure.no === index` の小節を返す |
| `findSegmentByTick` | `(score, tick) → Segment \| null` | 指定 tick のセグメントをカーソル経由で返す |
| `jumpToElement` | `(score, element, staffIdx?) → void` | 要素にビューをスクロールする。`element` が `null` なら何もしない |
| `jumpToMeasure` | `(score, measureIndex, staffIdx?) → boolean` | 小節を探してスクロール。成功なら `true`、小節が見つからなければ `false` |

---

### annotations — アノテーションのテキスト・スタッフ取得

```ts
import {
  getAnnotationText,
  getAnnotationStaffIdx,
} from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 | シグネチャ | 説明 |
| --- | --- | --- |
| `getAnnotationText` | `(ann) → string` | HTML タグを除去・トリムしたテキストを返す。`plainText` 優先、なければ `text` にフォールバック |
| `getAnnotationStaffIdx` | `(ann) → number` | アノテーションの staffIdx を解決する。スコア全体に掛かるアノテーションは `-1` |

---

### tracks — track ↔ staffIdx / voice の変換

```ts
import {
  VOICES_PER_STAFF,
  trackToStaffIdx,
  staffVoiceToTrack,
} from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 / 定数 | シグネチャ | 説明 |
| --- | --- | --- |
| `VOICES_PER_STAFF` | `4` | MuseScore の 1 スタッフあたりのボイス数 |
| `trackToStaffIdx` | `(track) → number` | `Math.floor(track / VOICES_PER_STAFF)` |
| `staffVoiceToTrack` | `(staffIdx, voice) → number` | `staffIdx * VOICES_PER_STAFF + voice` |

---

### note-type — グレースノートの判定

```ts
import {
  getNoteTypeName,
  isGraceNote,
  isGraceNoteBefore,
  isGraceNoteAfter,
} from "@kjfsm/musescore-plugin-sdk-helpers";
```

第 2 引数の `noteType` には実行時の `NoteType` enum オブジェクト（`host.NoteType`）を渡す。`NoteType` は要素側に名前アクセサが無いため、値を焼き込まず実行時 enum で判定する。

| 関数 | シグネチャ | 説明 |
| --- | --- | --- |
| `getNoteTypeName` | `(value, noteType) → string` | `chord.noteType` の値を enum 定数名に変換する。未知の値は数値文字列 |
| `isGraceNote` | `(chord, noteType) → boolean` | `chord.noteType !== noteType.NORMAL` |
| `isGraceNoteBefore` | `(chord, noteType) → boolean` | 拍の前に付くグレースノート（ACCIACCATURA / APPOGGIATURA / GRACE4/16/32） |
| `isGraceNoteAfter` | `(chord, noteType) → boolean` | 拍の後に付くグレースノート（GRACE8/16/32_AFTER） |

---

### cmd — コマンドのラッパ

```ts
import { withCmd } from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 | シグネチャ | 説明 |
| --- | --- | --- |
| `withCmd` | `(score, actionName, fn) → T` | `score.startCmd(actionName)` → `fn()` → `score.endCmd(false)` をまとめて実行する。例外が投げられた場合は `score.endCmd(true)` を呼んでから再スローする |

---

### metaTag — スコアのメタ情報

```ts
import { getMetaTag } from "@kjfsm/musescore-plugin-sdk-helpers";
```

| 関数 | シグネチャ | 説明 |
| --- | --- | --- |
| `getMetaTag` | `(score, tag) → string \| undefined` | `score.metaTag(tag)` の空文字列を `undefined` に変換する。`tag` には `"composer"` や `"title"` など |
