import type {
  BarLineType,
  ClefType,
  ElementTypeName,
  EngravingItem,
  Key,
  Measure,
  ScoreElement,
  Segment,
} from "@kjfsm/musescore-plugin-sdk-types";
import { VOICES_PER_STAFF } from "./tracks.js";

/** Returns the written time signature for the measure, e.g. "4/4". Empty string if unavailable. */
export function getMeasureTimeSig(measure: Measure): string {
  const frac = measure.timesigNominal ?? measure.timesigActual;
  return frac?.str ?? "";
}

/** Iterates measure segments to find the last BarLine element's barlineType. Returns null if none found. */
export function getMeasureEndBarlineType(measure: Measure): BarLineType | null {
  let result: BarLineType | null = null;
  for (const seg of measure.segments) {
    const el = seg.elementAt(0);
    if (el && el.name === "BarLine") {
      result = el.barlineType;
    }
  }
  return result;
}

export interface MeasureRepeatInfo {
  repeatStart: boolean;
  repeatEnd: boolean;
  repeatCount: number;
}

/** Returns repeat barline and volta count information for the measure. */
export function getMeasureRepeatInfo(measure: Measure): MeasureRepeatInfo {
  return {
    repeatStart: measure.repeatStart,
    repeatEnd: measure.repeatEnd,
    repeatCount: measure.repeatCount,
  };
}

/**
 * Reads the `actualKey` (concert key, in fifths) from a KeySig element at the given segment
 * for the given staff index. Returns null if no KeySig element is present at that track.
 */
export function getKeySigAt(segment: Segment, staffIdx: number): Key | null {
  for (let voice = 0; voice < VOICES_PER_STAFF; voice++) {
    const el = segment.elementAt(staffIdx * 4 + voice);
    if (el && el.name === "KeySig") {
      return el.actualKey;
    }
  }
  return null;
}

/**
 * Reads the `concertClefType` from a Clef element at the given segment for the given staff index.
 * Returns null if no Clef element is present at that track.
 */
export function getClefTypeAt(segment: Segment, staffIdx: number): ClefType | null {
  for (let voice = 0; voice < VOICES_PER_STAFF; voice++) {
    const el = segment.elementAt(staffIdx * 4 + voice);
    if (el && el.name === "Clef") {
      return el.concertClefType;
    }
  }
  return null;
}

// SMuFL symbol name → dynamic abbreviation
const SMUFL_DYNAMIC: Record<string, string> = {
  dynamicPPPPP: "ppppp",
  dynamicPPPP: "pppp",
  dynamicPPP: "ppp",
  dynamicPP: "pp",
  dynamicPiano: "p",
  dynamicMezzo: "m",
  dynamicForte: "f",
  dynamicFF: "ff",
  dynamicFFF: "fff",
  dynamicFFFF: "ffff",
  dynamicFFFFF: "fffff",
  dynamicSforzando: "sf",
  dynamicNiente: "n",
  dynamicRinforzando: "r",
  dynamicZ: "z",
  dynamicFP: "fp",
  dynamicSforzandoPiano: "sfp",
  dynamicSforzandoPianissimo: "sfpp",
  dynamicForteForte: "ff",
  dynamicPianoPiano: "pp",
};

/**
 * Converts Dynamic.plainText (SMuFL symbol names concatenated, e.g. "dynamicMezzodynamicPiano")
 * to a human-readable abbreviation ("mp").
 */
export function parseDynamicText(raw: string): string {
  const tokens = raw.split(/(?=dynamic[A-Z])/).filter(Boolean);
  return tokens.map((t) => SMUFL_DYNAMIC[t] ?? t).join("");
}

// --- Element-type predicates ---

// Single source of truth: ElementType member name → runtime element name(s).
//
// 実行時の判定は `el.name`（MuseScore が返す要素タイプ名の文字列）で行うため、焼き込んだ
// enum の【値】には依存しない。キーは `ElementTypeName`（生成 enum のメンバ名）で型付けされ、
// `satisfies` によりタイポ・未知のメンバ名がコンパイル時に弾かれる。
const ELEMENT_TYPE_NAMES = {
  DYNAMIC: "Dynamic",
  EXPRESSION: "Expression",
  TEMPO_TEXT: ["Tempo", "TempoText"] as const,
  STAFF_TEXT: "StaffText",
  SYSTEM_TEXT: "SystemText",
  REHEARSAL_MARK: "RehearsalMark",
  PLAYTECH_ANNOTATION: "PlayTechAnnotation",
  BAR_LINE: "BarLine",
  KEYSIG: "KeySig",
  TIMESIG: "TimeSig",
  CLEF: "Clef",
} satisfies Partial<Record<ElementTypeName, string | readonly string[]>>;

// Generates a type-guard predicate from a name or name list.
function makeIs(names: string | readonly string[]) {
  return (el: ScoreElement | null | undefined): el is EngravingItem =>
    el != null &&
    (Array.isArray(names) ? (names as readonly string[]).includes(el.name) : el.name === names);
}

export const isDynamic = makeIs(ELEMENT_TYPE_NAMES.DYNAMIC);
export const isExpression = makeIs(ELEMENT_TYPE_NAMES.EXPRESSION);
export const isTempo = makeIs(ELEMENT_TYPE_NAMES.TEMPO_TEXT);
export const isStaffText = makeIs(ELEMENT_TYPE_NAMES.STAFF_TEXT);
export const isSystemText = makeIs(ELEMENT_TYPE_NAMES.SYSTEM_TEXT);
export const isRehearsalMark = makeIs(ELEMENT_TYPE_NAMES.REHEARSAL_MARK);
export const isPlayTechAnnotation = makeIs(ELEMENT_TYPE_NAMES.PLAYTECH_ANNOTATION);
export const isBarLine = makeIs(ELEMENT_TYPE_NAMES.BAR_LINE);
export const isKeySig = makeIs(ELEMENT_TYPE_NAMES.KEYSIG);
export const isTimeSig = makeIs(ELEMENT_TYPE_NAMES.TIMESIG);
export const isClef = makeIs(ELEMENT_TYPE_NAMES.CLEF);

/** Converts TempoText.tempo (beats per second) to BPM. */
export function getTempoBpm(el: EngravingItem): number {
  return Math.round(el.tempo * 60);
}
