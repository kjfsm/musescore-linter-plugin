import type { CanonicalKinds } from "./types.js";

export const CANONICAL: CanonicalKinds = {
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
		OTHER: "other",
		UNKNOWN: "unknown",
	},
};

export function resolveBarlineKind(rawBarlineType: unknown): string {
	if (rawBarlineType == null) return CANONICAL.barlineKinds.UNKNOWN;
	if (rawBarlineType === 32) return CANONICAL.barlineKinds.FINAL;
	if (rawBarlineType === 2) return CANONICAL.barlineKinds.DOUBLE;
	return CANONICAL.barlineKinds.OTHER;
}
