export const CANONICAL = {
  elementKinds: {
    CHORD: "chord",
    REST: "rest",
    BAR_LINE: "bar_line",
    TEMPO_TEXT: "tempo_text",
    STAFF_TEXT: "staff_text",
    SYSTEM_TEXT: "system_text",
    EXPRESSION: "expression",
    REHEARSAL_MARK: "rehearsal_mark",
    DYNAMIC: "dynamic",
    UNKNOWN: "unknown",
  },
  barlineKinds: {
    DOUBLE: "double",
    FINAL: "final",
    // SDK helpers の classifyBarlineKind が返す文字列と一致させる
    REPEAT_START: "repeat_start",
    REPEAT_END: "repeat_end",
    REPEAT_BOTH: "repeat_both",
    OTHER: "other",
    UNKNOWN: "unknown",
  },
} as const;

type ElementKinds = typeof CANONICAL.elementKinds;
type BarlineKinds = typeof CANONICAL.barlineKinds;

export type ElementKind = ElementKinds[keyof ElementKinds];
export type BarlineKind = BarlineKinds[keyof BarlineKinds];
export type TextKind = Exclude<
  ElementKind,
  ElementKinds["CHORD"] | ElementKinds["REST"] | ElementKinds["BAR_LINE"]
>;

const BARLINE_KINDS: ReadonlySet<string> = new Set(Object.values(CANONICAL.barlineKinds));

/** ソースが返す小節線種別の文字列を BarlineKind に寄せる。語彙外は UNKNOWN。 */
export function toBarlineKind(raw: string): BarlineKind {
  return BARLINE_KINDS.has(raw) ? (raw as BarlineKind) : CANONICAL.barlineKinds.UNKNOWN;
}
