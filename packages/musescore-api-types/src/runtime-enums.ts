import type {
  BarLineType,
  BarLineTypeName,
  BracketType,
  BracketTypeName,
  ElementType,
  ElementTypeName,
  NoteType,
  NoteTypeName,
} from "./generated/enums.js";

/**
 * MuseScore (`MuseScore { }` ブロック) から実行時に渡される enum オブジェクトの型。
 *
 * QML の `Element` / `NoteType` などは「実行中の MuseScore が提供する」enum で、
 * `Element.NOTE` はその版の int 値に実行時解決される。生成 enum は型のみ（`const` を持たない
 * ブランド化された number 型）で出力されるため、値をビルド時に焼き込むこと自体ができない。
 * MuseScore のバージョン差で enum 値が並び替わっても壊れない（公式プラグインと同じ流儀）。
 *
 * - キー（メンバ名）は生成済み `<Enum>Name` から型付けされる → `Element.NOITE` のようなタイポや
 *   上流のリネームをコンパイル時に検出できる。
 * - 値は生成済みブランド型（`ElementType` 等）。ブランドが異なる enum 同士の比較
 *   （例: `el.type === host.NoteType.NORMAL`）は型エラーになる。
 *
 * @example
 * ```ts
 * // logic.ts — QML から `Logic.run(curScore, Element)` で渡す
 * export function run(score: Score | null, Element: ElementEnum): void {
 *   for (const el of iterate(score)) {
 *     if (el.type === Element.NOTE) { ... } // 実行中の版の値に解決される
 *   }
 * }
 * ```
 *
 * 補足: `ElementType` のように要素側に名前アクセサ（`el.name`）がある enum は、helpers の
 * 述語（`isNote` 等）のように `el.name` 文字列で判定でき、この enum オブジェクトを渡す必要はない。
 * `NoteType` / `BarLineType` のように int でしか取得できない enum で本型が必要になる。
 */
export type RuntimeEnum<Name extends string, Value> = { readonly [K in Name]: Value };

export type { BarLineTypeName, BracketTypeName, ElementTypeName, NoteTypeName };

/** 実行時の `Element` enum オブジェクト（`ElementType` のメンバ名でキー付け）。 */
export type ElementEnum = RuntimeEnum<ElementTypeName, ElementType>;

/** 実行時の `NoteType` enum オブジェクト。 */
export type NoteTypeEnum = RuntimeEnum<NoteTypeName, NoteType>;

/** 実行時の `BarLineType` enum オブジェクト。 */
export type BarLineTypeEnum = RuntimeEnum<BarLineTypeName, BarLineType>;

/**
 * 実行時の `BracketType` enum オブジェクト。
 *
 * システムブラケット（`Staff.brackets` の各要素が持つ `systemBracket`）は int でしか
 * 取得できず、要素側に名前アクセサが無いため、判定にはこの enum オブジェクトが要る。
 */
export type BracketTypeEnum = RuntimeEnum<BracketTypeName, BracketType>;
