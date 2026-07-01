import type {
	BarLineTypeEnum,
	NoteTypeEnum,
} from "@kjfsm/musescore-plugin-sdk-types";

export type Severity = "error" | "warning" | "info";

/**
 * QML から `buildSnapshot(curScore, NoteType, BarLineType)` で渡す実行時 enum セット。
 * 値を TypeScript の定数に焼き込まず、実行中の MuseScore が提供する enum を使うことで
 * バージョン差の再採番による誤判定を防ぐ。
 */
export interface HostEnums {
	noteType: NoteTypeEnum;
	barLineType: BarLineTypeEnum;
}

export interface NoteInfo {
	pitch: number; // MIDI 音高（0-127）。不明は -1
	tpc: number; // tonal pitch class（綴り）。C = 14
	line: number; // 譜表上の位置（音部記号に応じた音名+オクターブ）
	accidentalShown: boolean; // この符頭に臨時記号が表示されているか
}

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
	stemDirection?: number; // chord のみ。DirectionV 生値（0 auto / 1 up / 2 down）
	beamMode?: number; // chord のみ。BeamMode 生値
	articulations?: string[]; // chord のみ。アーティキュレーション名（"Staccato" 等）
	notes?: NoteInfo[]; // chord のみ。各音符の綴り情報（音高/tpc/譜表位置/臨時記号表示）
}

export interface IRIndex {
	byTick: Record<string, number[]>;
	byKind: Record<string, number[]>;
	byStaff: Record<string, number[]>;
	byStaffAndKind: Record<string, Record<string, number[]>>;
}

export interface HairpinInfo {
	staffIdx: number;
	startTick: number;
	endTick: number;
}

export interface SlurInfo {
	staffIdx: number;
	voice: number;
	startTick: number;
	endTick: number;
}

export interface TieInfo {
	staffIdx: number;
	voice: number;
	startTick: number;
	endTick: number;
	// タイ両端ノートの MIDI 音高。端点が欠落/無音程の場合は null。
	startPitch: number | null;
	endPitch: number | null;
}

export interface IRMeta {
	parts: { staffIdx: number; partName: string }[];
	firstMusicTickByStaff: (number | null)[];
	lastTick: number;
	hairpins: HairpinInfo[];
	slurs: SlurInfo[];
	ties: TieInfo[];
}

export interface IRDerived {
	_eventsCount: number;
	firstChordByStaff: Record<number, { tick: number; measure: number }>;
	annotationIdsByTick: Record<string, number[]>;
	globalAnnotationIdsByTick: Record<string, number[]>;
	// chord イベント id → アーティキュレーション名
	articulationsByChordId: Record<number, string[]>;
	// staffIdx → スラー（startTick 昇順）
	slursByStaff: Record<number, SlurInfo[]>;
	// `${staffIdx}:${measure}:${voice}` → リズム署名（声部横断の同リズム判定キー）
	rhythmByStaffMeasure: Record<string, string>;
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
		REPEAT_START: string;
		REPEAT_END: string;
		REPEAT_BOTH: string;
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
