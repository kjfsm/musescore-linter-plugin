import type { Chord, NoteTypeEnum } from "@kjfsm/musescore-plugin-sdk-types";

// グレースノートを表す NoteType メンバ。値は実行時に渡される `NoteType` から取り出すため、
// 焼き込んだ enum 値には依存しない（MuseScore のバージョン差で値が変わっても壊れない）。
const GRACE_BEFORE_MEMBERS = [
  "ACCIACCATURA",
  "APPOGGIATURA",
  "GRACE4",
  "GRACE16",
  "GRACE32",
] as const satisfies readonly (keyof NoteTypeEnum)[];
const GRACE_AFTER_MEMBERS = [
  "GRACE8_AFTER",
  "GRACE16_AFTER",
  "GRACE32_AFTER",
] as const satisfies readonly (keyof NoteTypeEnum)[];

function maskOf(noteType: NoteTypeEnum, members: readonly (keyof NoteTypeEnum)[]): number {
  let mask = 0;
  for (const m of members) mask |= noteType[m];
  return mask;
}

/**
 * NoteType の数値を MuseScore の enum 定数名に変換する。未知の値は数値文字列で返す。
 *
 * @param value 判定対象の `chord.noteType` の値。
 * @param noteType QML から渡される実行時の `NoteType` enum オブジェクト。
 */
export function getNoteTypeName(value: number, noteType: NoteTypeEnum): string {
  for (const [name, v] of Object.entries(noteType)) {
    if (v === value) return name;
  }
  return String(value);
}

/** 拍の前に付くグレースノート（アッチャカトゥーラ・アポジャトゥーラ・GRACE4/16/32）かどうか。 */
export function isGraceNoteBefore(chord: Chord, noteType: NoteTypeEnum): boolean {
  return (chord.noteType & maskOf(noteType, GRACE_BEFORE_MEMBERS)) !== 0;
}

/** 拍の後に付くグレースノート（GRACE8/16/32_AFTER）かどうか。 */
export function isGraceNoteAfter(chord: Chord, noteType: NoteTypeEnum): boolean {
  return (chord.noteType & maskOf(noteType, GRACE_AFTER_MEMBERS)) !== 0;
}

/** NORMAL 以外のノートタイプ（前後どちらかのグレースノート）かどうか。 */
export function isGraceNote(chord: Chord, noteType: NoteTypeEnum): boolean {
  return chord.noteType !== noteType.NORMAL;
}
