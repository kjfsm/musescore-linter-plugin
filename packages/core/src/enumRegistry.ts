import type { CanonicalKinds, MuseScoreEnums } from "./types.js";

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
		OTHER: "other",
		UNKNOWN: "unknown",
	},
};

export interface EnumRegistry {
	canonical: CanonicalKinds;
	resolveElementKind(rawType: unknown): string;
	resolveBarlineKind(rawBarlineType: unknown): string;
}

export function buildEnumRegistry(E: MuseScoreEnums): EnumRegistry {
	const enums = E ?? {};

	function resolveElementKind(rawType: unknown): string {
		if (rawType == null) return CANONICAL.elementKinds.UNKNOWN;
		if (enums.CHORD !== undefined && rawType === enums.CHORD)
			return CANONICAL.elementKinds.CHORD;
		if (enums.REST !== undefined && rawType === enums.REST)
			return CANONICAL.elementKinds.REST;
		if (enums.BAR_LINE !== undefined && rawType === enums.BAR_LINE)
			return CANONICAL.elementKinds.BAR_LINE;
		if (enums.TEMPO_TEXT !== undefined && rawType === enums.TEMPO_TEXT)
			return CANONICAL.elementKinds.TEMPO_TEXT;
		if (enums.STAFF_TEXT !== undefined && rawType === enums.STAFF_TEXT)
			return CANONICAL.elementKinds.STAFF_TEXT;
		if (enums.SYSTEM_TEXT !== undefined && rawType === enums.SYSTEM_TEXT)
			return CANONICAL.elementKinds.SYSTEM_TEXT;
		if (enums.EXPRESSION !== undefined && rawType === enums.EXPRESSION)
			return CANONICAL.elementKinds.EXPRESSION;
		if (enums.REHEARSAL_MARK !== undefined && rawType === enums.REHEARSAL_MARK)
			return CANONICAL.elementKinds.REHEARSAL_MARK;
		if (enums.DYNAMIC !== undefined && rawType === enums.DYNAMIC)
			return CANONICAL.elementKinds.DYNAMIC;
		return CANONICAL.elementKinds.UNKNOWN;
	}

	function resolveBarlineKind(rawBarlineType: unknown): string {
		if (rawBarlineType == null) return CANONICAL.barlineKinds.UNKNOWN;
		if (enums.BARLINE_DOUBLE != null) {
			if (rawBarlineType === enums.BARLINE_DOUBLE)
				return CANONICAL.barlineKinds.DOUBLE;
		} else if (rawBarlineType === 2) {
			return CANONICAL.barlineKinds.DOUBLE;
		}
		return CANONICAL.barlineKinds.OTHER;
	}

	return { canonical: CANONICAL, resolveElementKind, resolveBarlineKind };
}
