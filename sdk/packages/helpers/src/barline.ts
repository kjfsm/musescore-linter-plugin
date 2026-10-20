import type {
  BarLineType,
  BarLineTypeEnum,
  BarLineTypeName,
} from "@kjfsm/musescore-plugin-sdk-types";

export type BarlineKind =
  | "final"
  | "double"
  | "repeat_start"
  | "repeat_end"
  | "repeat_both"
  | "other";

// Single source of truth: BarLineType member name → semantic category.
// Repeat barlines are distinguished into start / end / both (END_START_REPEAT) so callers
// can match opening and closing repeats. `Record<BarLineTypeName, ...>` guarantees every
// member is classified — a member added upstream and missing here is a compile error.
const BARLINE_KIND: Record<BarLineTypeName, BarlineKind> = {
  END: "final",
  REVERSE_END: "final",
  DOUBLE: "double",
  START_REPEAT: "repeat_start",
  END_REPEAT: "repeat_end",
  END_START_REPEAT: "repeat_both",
  NORMAL: "other",
  BROKEN: "other",
  DOTTED: "other",
  HEAVY: "other",
  DOUBLE_HEAVY: "other",
};

/**
 * Classifies a BarLineType value into a semantic category.
 * `type` is the raw runtime value (e.g. `el.barlineType`); `barLineType` is the host's
 * runtime enum object (e.g. `host.BarLineType`) used to resolve member values without
 * baking in a specific MuseScore version's int assignment.
 */
export function classifyBarlineKind(type: BarLineType, barLineType: BarLineTypeEnum): BarlineKind {
  for (const name of Object.keys(BARLINE_KIND) as BarLineTypeName[]) {
    if (barLineType[name] === type) return BARLINE_KIND[name];
  }
  return "other";
}
