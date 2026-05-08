import type { Score } from "@kjfsm/musescore-plugin-sdk-types";
import type { PluginSegment, TextAnnotation } from "@musescore-linter/musescore-api";
import { buildEnumRegistry, type EnumRegistry } from "./enumRegistry.js";
import { make } from "./logger.js";
import type { LintEvent, LintIR, MuseScoreEnums } from "./types.js";

const log = make("snapshot");

function getPartName(score: Score, staffIdx: number): string {
	if (!score.parts) return `Staff ${staffIdx + 1}`;
	let trackOffset = 0;
	for (const part of score.parts) {
		const staveCount = part.endTrack / 4 - part.startTrack / 4;
		if (staffIdx >= trackOffset && staffIdx < trackOffset + staveCount) {
			const name = part.longName ?? "";
			return name.length > 0 ? name : `Staff ${staffIdx + 1}`;
		}
		trackOffset += staveCount;
	}
	return `Staff ${staffIdx + 1}`;
}

function resolveAnnotationStaffIdx(ann: TextAnnotation): number {
	if (ann.track != null && ann.track >= 0) return Math.floor(ann.track / 4);
	if (ann.staffIdx != null && ann.staffIdx >= 0) return ann.staffIdx;
	return -1;
}

function pushIndexedId(
	map: Record<string, number[]>,
	key: string | number,
	eventId: number,
): void {
	const k = String(key);
	if (!map[k]) map[k] = [];
	map[k].push(eventId);
}

export function normalizeText(rawText: string): string {
	return (rawText ?? "")
		.replace(/<[^>]*>/g, "")
		.toLowerCase()
		.trim();
}

function appendEvent(
	ir: LintIR,
	payload: Partial<LintEvent> & { kind: string },
): LintEvent {
	const ev: LintEvent = {
		id: ir.events.length,
		tick: payload.tick ?? 0,
		measure: payload.measure ?? 0,
		staffIdx: payload.staffIdx ?? -1,
		voice: payload.voice ?? -1,
		kind: payload.kind,
		type: payload.type ?? "other",
		subtype: payload.subtype ?? null,
		subStyle: payload.subStyle ?? null,
		tempo: payload.tempo ?? null,
		textNorm: payload.textNorm ?? "",
		textRaw: payload.textRaw ?? "",
		scope: payload.scope ?? "staff",
	};

	if (payload.barlineType !== undefined) ev.barlineType = payload.barlineType;
	if (payload.barlineKind !== undefined) ev.barlineKind = payload.barlineKind;
	if (payload.duration !== undefined) ev.duration = payload.duration;

	ir.events.push(ev);

	pushIndexedId(ir.index.byTick, ev.tick, ev.id);
	pushIndexedId(ir.index.byKind, ev.kind, ev.id);
	pushIndexedId(ir.index.byStaff, ev.staffIdx, ev.id);

	if (!ir.index.byStaffAndKind[ev.staffIdx]) {
		ir.index.byStaffAndKind[ev.staffIdx] = {};
	}
	pushIndexedId(ir.index.byStaffAndKind[ev.staffIdx], ev.kind, ev.id);

	if (ev.tick > ir.meta.lastTick) ir.meta.lastTick = ev.tick;
	return ev;
}

function processAnnotations(
	seg: PluginSegment,
	measureNum: number,
	registry: EnumRegistry,
	ir: LintIR,
): void {
	if (!seg.annotations) return;

	for (const ann of seg.annotations) {
		const annStaffIdx = resolveAnnotationStaffIdx(ann);
		const rawText = ann.plainText ?? ann.text ?? "";
		const cleanText = normalizeText(rawText);
		if (cleanText.length === 0) continue;

		const annKind = registry.resolveElementKind(ann.type);
		appendEvent(ir, {
			type: "text",
			kind: annKind,
			tick: seg.tick,
			measure: measureNum,
			staffIdx: annStaffIdx >= 0 ? annStaffIdx : -1,
			voice: -1,
			subtype: ann.subtype,
			subStyle: ann.subStyle,
			tempo: ann.tempo ?? null,
			textNorm: cleanText,
			textRaw: rawText.replace(/<[^>]*>/g, "").trim(),
			scope: annStaffIdx >= 0 ? "staff" : "global",
		});
	}
}

function processStaffElements(
	seg: PluginSegment,
	measureNum: number,
	staffIdx: number,
	registry: EnumRegistry,
	ir: LintIR,
): void {
	const canonical = registry.canonical;

	for (let voice = 0; voice < 4; voice++) {
		const track = staffIdx * 4 + voice;
		const el = seg.elementAt(track);
		if (!el) continue;

		const kind = registry.resolveElementKind(el.type);
		if (
			kind === canonical.elementKinds.CHORD ||
			kind === canonical.elementKinds.REST
		) {
			const evType = kind === canonical.elementKinds.CHORD ? "chord" : "rest";
			appendEvent(ir, {
				type: evType as "chord" | "rest",
				kind,
				tick: seg.tick,
				measure: measureNum,
				staffIdx,
				voice,
				scope: "staff",
				...(el.duration
					? {
							duration: {
								numerator: el.duration.numerator,
								denominator: el.duration.denominator,
							},
						}
					: {}),
			});

			if (ir.meta.firstMusicTickByStaff[staffIdx] === null) {
				ir.meta.firstMusicTickByStaff[staffIdx] = seg.tick;
			}
		}
	}

	for (let v = 0; v < 4; v++) {
		const barEl = seg.elementAt(staffIdx * 4 + v);
		if (
			barEl &&
			registry.resolveElementKind(barEl.type) ===
				canonical.elementKinds.BAR_LINE
		) {
			appendEvent(ir, {
				type: "barline",
				kind: canonical.elementKinds.BAR_LINE,
				barlineType: barEl.barLineType,
				barlineKind: registry.resolveBarlineKind(barEl.barLineType),
				tick: seg.tick,
				measure: measureNum,
				staffIdx,
				voice: -1,
				scope: "staff",
			});
			break;
		}
	}
}

export function buildSnapshot(score: Score, E: MuseScoreEnums): LintIR {
	const registry = buildEnumRegistry(E);
	const numStaves = score.nstaves;

	const ir: LintIR = {
		events: [],
		index: { byStaff: {}, byTick: {}, byKind: {}, byStaffAndKind: {} },
		meta: {
			parts: Array.from({ length: numStaves }, (_, i) => ({
				staffIdx: i,
				partName: getPartName(score, i),
			})),
			firstMusicTickByStaff: Array(numStaves).fill(null) as (number | null)[],
			lastTick: 0,
		},
		registry: { canonical: registry.canonical },
		derived: null,
	};

	let measureNum = 1;
	let m = score.firstMeasure;
	while (m) {
		try {
			let seg = m.firstSegment as PluginSegment | null;
			const measureEndTick = m.nextMeasure?.firstSegment?.tick ?? null;

			while (seg) {
				if (measureEndTick !== null && seg.tick >= measureEndTick) break;
				processAnnotations(seg, measureNum, registry, ir);
				for (let staffIdx = 0; staffIdx < numStaves; staffIdx++) {
					processStaffElements(seg, measureNum, staffIdx, registry, ir);
				}
				seg = seg.next as PluginSegment | null;
			}
		} catch (e) {
			log.warn(`measure ${measureNum} の解析中にエラー: ${e}`);
		}

		measureNum++;
		m = m.nextMeasure;
	}

	log.info(
		`LintIR を生成: events=${ir.events.length}, parts=${ir.meta.parts.length}, lastTick=${ir.meta.lastTick}`,
	);
	return ir;
}
