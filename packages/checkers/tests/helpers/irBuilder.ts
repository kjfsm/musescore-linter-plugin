import type { LintEvent, LintIR } from "@musescore-linter/core";
import { CANONICAL } from "@musescore-linter/core";

export { CANONICAL };

export interface EventSpec {
	kind: string;
	tick?: number;
	measure?: number;
	staff?: number;
	staffIdx?: number;
	voice?: number;
	textNorm?: string;
	textRaw?: string;
	tempo?: number;
	barlineKind?: string;
	duration?: { numerator: number; denominator: number };
	scope?: "staff" | "global";
	subtype?: unknown;
	subStyle?: unknown;
	stemDirection?: number;
	beamMode?: number;
	articulations?: string[];
}

export interface PartSpec {
	staffIdx?: number;
	partName?: string;
}

export interface HairpinSpec {
	staffIdx: number;
	startTick: number;
	endTick: number;
}

export interface SlurSpec {
	staffIdx: number;
	voice: number;
	startTick: number;
	endTick: number;
}

export interface IRSpec {
	parts?: PartSpec[];
	events?: EventSpec[];
	hairpins?: HairpinSpec[];
	slurs?: SlurSpec[];
}

function typeFromKind(kind: string): LintEvent["type"] {
	if (kind === CANONICAL.elementKinds.CHORD) return "chord";
	if (kind === CANONICAL.elementKinds.REST) return "rest";
	if (kind === CANONICAL.elementKinds.BAR_LINE) return "barline";
	return "text";
}

function pushId(
	map: Record<string, number[]>,
	key: string | number,
	id: number,
): void {
	const k = String(key);
	if (!map[k]) map[k] = [];
	map[k].push(id);
}

export function buildIR(spec: IRSpec): LintIR {
	const parts = (spec.parts ?? []).map((p, i) => ({
		staffIdx: p.staffIdx !== undefined ? p.staffIdx : i,
		partName: p.partName ?? `Staff ${i + 1}`,
	}));

	const ir: LintIR = {
		events: [],
		index: { byStaff: {}, byTick: {}, byKind: {}, byStaffAndKind: {} },
		meta: {
			parts,
			firstMusicTickByStaff: parts.map(() => null),
			lastTick: 0,
			hairpins: (spec.hairpins ?? []).map((h) => ({ ...h })),
			slurs: (spec.slurs ?? []).map((s) => ({ ...s })),
		},
		registry: { canonical: CANONICAL },
		derived: null,
	};

	for (const e of spec.events ?? []) {
		const staffIdx =
			e.staff !== undefined
				? e.staff
				: e.staffIdx !== undefined
					? e.staffIdx
					: -1;
		const defaultScope: "staff" | "global" = staffIdx >= 0 ? "staff" : "global";

		const ev: LintEvent = {
			id: ir.events.length,
			tick: e.tick ?? 0,
			measure: e.measure ?? 1,
			staffIdx,
			voice: e.voice ?? -1,
			kind: e.kind,
			type: e.scope === "global" ? "text" : typeFromKind(e.kind),
			subtype: e.subtype ?? null,
			subStyle: e.subStyle ?? null,
			tempo: e.tempo ?? null,
			textNorm: e.textNorm ?? "",
			textRaw: e.textRaw ?? "",
			scope: e.scope ?? defaultScope,
		};

		if (e.barlineKind !== undefined) ev.barlineKind = e.barlineKind;
		if (e.duration !== undefined) ev.duration = e.duration;
		if (e.stemDirection !== undefined) ev.stemDirection = e.stemDirection;
		if (e.beamMode !== undefined) ev.beamMode = e.beamMode;
		if (e.articulations !== undefined) ev.articulations = e.articulations;

		ir.events.push(ev);

		pushId(ir.index.byTick, ev.tick, ev.id);
		pushId(ir.index.byKind, ev.kind, ev.id);
		pushId(ir.index.byStaff, ev.staffIdx, ev.id);

		if (!ir.index.byStaffAndKind[ev.staffIdx])
			ir.index.byStaffAndKind[ev.staffIdx] = {};
		pushId(ir.index.byStaffAndKind[ev.staffIdx], ev.kind, ev.id);

		if (ev.tick > ir.meta.lastTick) ir.meta.lastTick = ev.tick;

		const isMusic =
			ev.kind === CANONICAL.elementKinds.CHORD ||
			ev.kind === CANONICAL.elementKinds.REST;
		if (
			ev.staffIdx >= 0 &&
			isMusic &&
			ir.meta.firstMusicTickByStaff[ev.staffIdx] === null
		) {
			ir.meta.firstMusicTickByStaff[ev.staffIdx] = ev.tick;
		}
	}

	return ir;
}

const K = CANONICAL.elementKinds;
const BK = CANONICAL.barlineKinds;

/** 全チェッカーをパスするクリーンな最小 IR に追加イベントを加えたものを返す */
export function cleanIR(extra: EventSpec[] = []): LintIR {
	return buildIR({
		parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
		events: [
			{
				kind: K.TEMPO_TEXT,
				staff: 0,
				tick: 0,
				measure: 1,
				tempo: 2.0,
				textNorm: "allegro",
				textRaw: "Allegro",
			},
			{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
			{ kind: K.CHORD, staff: 1, tick: 0, measure: 1 },
			{
				kind: K.DYNAMIC,
				staff: 0,
				tick: 0,
				measure: 1,
				textNorm: "f",
				textRaw: "f",
			},
			{
				kind: K.DYNAMIC,
				staff: 1,
				tick: 0,
				measure: 1,
				textNorm: "f",
				textRaw: "f",
			},
			...extra,
		],
	});
}

/** 弦楽五重奏（Vn1/Vn2/Va/Vc/Cb）の 5 スタッフをパスするクリーン IR */
export function quintetIR(extra: EventSpec[] = []): LintIR {
	const staffNames = ["Vn1", "Vn2", "Va", "Vc", "Cb"];
	const chords = staffNames.map((_, i) => ({
		kind: K.CHORD,
		staff: i,
		tick: 0,
		measure: 1,
	}));
	const dynamics = staffNames.map((_, i) => ({
		kind: K.DYNAMIC,
		staff: i,
		tick: 0,
		measure: 1,
		textNorm: "f",
		textRaw: "f",
	}));
	return buildIR({
		parts: staffNames.map((name) => ({ partName: name })),
		events: [
			{
				kind: K.TEMPO_TEXT,
				staff: 0,
				tick: 0,
				measure: 1,
				tempo: 2.0,
				textNorm: "allegro",
				textRaw: "Allegro",
			},
			...chords,
			...dynamics,
			...extra,
		],
	});
}

export { BK, K };
