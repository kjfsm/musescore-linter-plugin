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
		// SDK helpers の classifyBarlineKind が返す文字列と一致させる
		REPEAT_START: "repeat_start",
		REPEAT_END: "repeat_end",
		REPEAT_BOTH: "repeat_both",
		OTHER: "other",
		UNKNOWN: "unknown",
	},
};
