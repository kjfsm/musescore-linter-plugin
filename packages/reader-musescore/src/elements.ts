import type { BarLineTypeName, Chord, Tie } from "@score-linter/musescore-api-types";
import type { BarlineKind, Note } from "@score-linter/score-model";

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
 * 強弱記号のテキストを人が読む文字に直す。MuseScore の Dynamic の plainText は SMuFL の
 * シンボル名が連なった形で届く（「mp」は "dynamicMezzodynamicPiano"）。
 */
export function dynamicText(raw: string): string {
  return raw
    .split(/(?=dynamic[A-Z])/)
    .filter(Boolean)
    .map((t) => SMUFL_DYNAMIC[t] ?? t)
    .join("");
}

export function notesOf(chord: Chord): Note[] {
  return (chord.notes ?? []).map((note) => ({
    pitch: typeof note.pitch === "number" ? note.pitch : null,
    tpc: note.tpc,
    line: note.line,
    accidentalShown: note.accidental != null,
  }));
}

/** タイの両端の音高。端の音符が無いか音高を持たなければ null。 */
export function tiePitches(tie: Tie): { startPitch: number | null; endPitch: number | null } {
  const start = tie.startNote?.pitch;
  const end = tie.endNote?.pitch;
  if (typeof start !== "number" || typeof end !== "number")
    return { startPitch: null, endPitch: null };
  return { startPitch: start, endPitch: end };
}

// Record<BarLineTypeName, …> にしてあるので、上流で足されたメンバの分類漏れは型エラーになる
const BARLINE_KIND: Record<BarLineTypeName, BarlineKind> = {
  END: "final",
  REVERSE_END: "final",
  DOUBLE: "double",
  START_REPEAT: "repeat-start",
  END_REPEAT: "repeat-end",
  END_START_REPEAT: "repeat-both",
  NORMAL: "other",
  BROKEN: "other",
  DOTTED: "other",
  HEAVY: "other",
  DOUBLE_HEAVY: "other",
};

export function barlineKindOf(name: BarLineTypeName | null): BarlineKind {
  return name === null ? "other" : BARLINE_KIND[name];
}
