export type Severity = "error" | "warning" | "info";

export interface LintEvent {
	id: number;
	tick: number;
	measure: number;
	staffIdx: number; // -1 = global scope
	voice: number;
	kind: string; // canonical 文字列
	type: "chord" | "rest" | "text" | "barline" | "other";
	textNorm: string;
	textRaw: string;
	scope: "staff" | "global";
	subtype: unknown;
	subStyle: unknown;
	tempo: number | null;
	barlineType?: unknown;
	barlineKind?: string;
	duration?: { numerator: number; denominator: number };
}

export interface IRIndex {
	byTick: Record<string, number[]>;
	byKind: Record<string, number[]>;
	byStaff: Record<string, number[]>;
	byStaffAndKind: Record<string, Record<string, number[]>>;
}

export interface IRMeta {
	parts: { staffIdx: number; partName: string }[];
	firstMusicTickByStaff: (number | null)[];
	lastTick: number;
}

export interface IRDerived {
	_eventsCount: number;
	firstChordByStaff: Record<number, { tick: number; measure: number }>;
	annotationIdsByTick: Record<string, number[]>;
	globalAnnotationIdsByTick: Record<string, number[]>;
}

export interface CanonicalKinds {
	elementKinds: {
		CHORD: string;
		REST: string;
		BAR_LINE: string;
		TEMPO_TEXT: string;
		STAFF_TEXT: string;
		SYSTEM_TEXT: string;
		EXPRESSION: string;
		REHEARSAL_MARK: string;
		DYNAMIC: string;
		UNKNOWN: string;
	};
	barlineKinds: {
		DOUBLE: string;
		FINAL: string;
		OTHER: string;
		UNKNOWN: string;
	};
}

export interface LintIR {
	events: LintEvent[];
	index: IRIndex;
	meta: IRMeta;
	registry: { canonical: CanonicalKinds };
	derived: IRDerived | null;
}

export interface Issue {
	ruleId: string;
	severity: Severity;
	category: string;
	message: string;
	partName: string;
	staffIdx: number;
	measure: number;
	tick: number;
	detail: Record<string, unknown> | null;
}

export interface Checker {
	id: string;
	name: string;
	description: string;
	category: string;
	severity: Severity;
	defaultEnabled: boolean;
	run(ir: LintIR): Issue[];
}

export interface TextPairCheckerConfig {
	id: string;
	name: string;
	description?: string;
	category?: string;
	severity?: Severity;
	defaultEnabled?: boolean;
	onPatterns: string[];
	offPatterns: string[];
	defaultState: "on" | "off";
	onLabel: string;
	offLabel: string;
}

