import {
	getAnnotationStaffIdx,
	getAnnotationText,
	getArticulationNames,
	getHairpinRange,
	getNoteSpellings,
	getSpannerRange,
	getTempoBpm,
	getTiePitches,
	isBarLine,
	isChord,
	isDynamic,
	isExpression,
	isGraceNote,
	isHairpin,
	isPlayTechAnnotation,
	isRehearsalMark,
	isRest,
	isSlur,
	isStaffText,
	isSystemText,
	isTempo,
	iterateMeasureSegments,
	iterateMeasures,
	iterateStaves,
	parseDynamicText,
	staffVoiceToTrack,
	trackToStaffIdx,
	VOICES_PER_STAFF,
} from "@kjfsm/musescore-plugin-sdk-helpers";
import type { BarLineTypeEnum, Score } from "@kjfsm/musescore-plugin-sdk-types";
import type {
	PluginSegment,
	TextAnnotation,
} from "@musescore-linter/musescore-api";
import { CANONICAL } from "./enumRegistry.js";
import { make } from "./logger.js";
import type { HostEnums, LintEvent, LintIR } from "./types.js";

const log = make("snapshot");

function getPartName(score: Score, staffIdx: number): string {
	if (!score.parts) return `Staff ${staffIdx + 1}`;
	let trackOffset = 0;
	for (const part of score.parts) {
		const staveCount =
			trackToStaffIdx(part.endTrack) - trackToStaffIdx(part.startTrack);
		if (staffIdx >= trackOffset && staffIdx < trackOffset + staveCount) {
			const name = part.longName ?? "";
			return name.length > 0 ? name : `Staff ${staffIdx + 1}`;
		}
		trackOffset += staveCount;
	}
	return `Staff ${staffIdx + 1}`;
}

// `classifyBarlineKind`（SDK helper）は静的 enum 定数で比較するため、MuseScore の
// バージョン差で BarLineType が再採番された場合に誤判定する恐れがある。
// 実行時 BarLineType を受け取るこちらの関数で比較することで安全にする。
function classifyBarlineKindRuntime(type: number, rt: BarLineTypeEnum): string {
	if (type === rt.END || type === rt.REVERSE_END) return "final";
	if (type === rt.DOUBLE) return "double";
	if (type === rt.START_REPEAT) return "repeat_start";
	if (type === rt.END_REPEAT) return "repeat_end";
	if (type === rt.END_START_REPEAT) return "repeat_both";
	return "other";
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

function resolveAnnotationKind(ann: TextAnnotation): string {
	if (isTempo(ann)) return CANONICAL.elementKinds.TEMPO_TEXT;
	if (isDynamic(ann)) return CANONICAL.elementKinds.DYNAMIC;
	if (isExpression(ann)) return CANONICAL.elementKinds.EXPRESSION;
	if (isStaffText(ann) || isPlayTechAnnotation(ann))
		return CANONICAL.elementKinds.STAFF_TEXT;
	if (isSystemText(ann)) return CANONICAL.elementKinds.SYSTEM_TEXT;
	if (isRehearsalMark(ann)) return CANONICAL.elementKinds.REHEARSAL_MARK;
	return CANONICAL.elementKinds.UNKNOWN;
}

function resolveAnnotationTextNorm(
	ann: TextAnnotation,
	textRaw: string,
): string {
	if (isDynamic(ann)) return parseDynamicText(textRaw);
	return textRaw.toLowerCase();
}

function processAnnotations(
	seg: PluginSegment,
	measureNum: number,
	ir: LintIR,
): void {
	if (!seg.annotations) return;

	for (const ann of seg.annotations) {
		const textRaw = getAnnotationText(ann);
		if (textRaw.length === 0) continue;

		const annStaffIdx = getAnnotationStaffIdx(ann);
		const annKind = resolveAnnotationKind(ann);
		const textNorm = resolveAnnotationTextNorm(ann, textRaw);
		const tempo = isTempo(ann) ? getTempoBpm(ann) : null;

		appendEvent(ir, {
			type: "text",
			kind: annKind,
			tick: seg.tick,
			measure: measureNum,
			staffIdx: annStaffIdx >= 0 ? annStaffIdx : -1,
			voice: -1,
			subtype: ann.subtype,
			subStyle: ann.subStyle,
			tempo,
			textNorm,
			textRaw,
			scope: annStaffIdx >= 0 ? "staff" : "global",
		});
	}
}

function processStaffElements(
	seg: PluginSegment,
	measureNum: number,
	staffIdx: number,
	ir: LintIR,
	hostEnums: HostEnums,
): void {
	for (let voice = 0; voice < VOICES_PER_STAFF; voice++) {
		const el = seg.elementAt(staffVoiceToTrack(staffIdx, voice));
		if (!el) continue;

		// グレースノートは LintIR に含めない（拍位置のタイミングを持たないため）
		if (isChord(el) && isGraceNote(el, hostEnums.noteType)) continue;

		if (isChord(el) || isRest(el)) {
			const evType = isChord(el) ? "chord" : "rest";
			const kind = isChord(el)
				? CANONICAL.elementKinds.CHORD
				: CANONICAL.elementKinds.REST;
			const ev = appendEvent(ir, {
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

			if (isChord(el)) {
				ev.stemDirection = el.stemDirection;
				ev.beamMode = el.beamMode;
				ev.articulations = getArticulationNames(el);
				ev.notes = getNoteSpellings(el);
				for (const note of el.notes ?? []) {
					const tie = note.tieForward;
					if (tie) {
						const tiePitches = getTiePitches(tie);
						ir.meta.ties.push({
							staffIdx,
							voice,
							...getSpannerRange(tie),
							startPitch: tiePitches?.startPitch ?? null,
							endPitch: tiePitches?.endPitch ?? null,
						});
					}
					for (const spanner of note.spannerForward ?? []) {
						if (isHairpin(spanner)) {
							ir.meta.hairpins.push({ staffIdx, ...getHairpinRange(spanner) });
						} else if (isSlur(spanner)) {
							ir.meta.slurs.push({
								staffIdx,
								voice,
								...getSpannerRange(spanner),
							});
						}
					}
				}
			}
		}
	}

	for (let v = 0; v < VOICES_PER_STAFF; v++) {
		const barEl = seg.elementAt(staffVoiceToTrack(staffIdx, v));
		if (barEl && isBarLine(barEl)) {
			appendEvent(ir, {
				type: "barline",
				kind: CANONICAL.elementKinds.BAR_LINE,
				barlineType: barEl.barlineType,
				barlineKind: classifyBarlineKindRuntime(
					barEl.barlineType as number,
					hostEnums.barLineType,
				),
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

export function buildSnapshot(score: Score, hostEnums: HostEnums): LintIR {
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
			hairpins: [],
			slurs: [],
			ties: [],
		},
		registry: { canonical: CANONICAL },
		derived: null,
	};

	let measureNum = 1;
	for (const m of iterateMeasures(score)) {
		try {
			for (const seg of iterateMeasureSegments(m) as Iterable<PluginSegment>) {
				processAnnotations(seg, measureNum, ir);
				for (const staffIdx of iterateStaves(score)) {
					processStaffElements(seg, measureNum, staffIdx, ir, hostEnums);
				}
			}
		} catch (e) {
			log.warn(`measure ${measureNum} の解析中にエラー: ${e}`);
		}
		measureNum++;
	}

	log.info(
		`LintIR を生成: events=${ir.events.length}, parts=${ir.meta.parts.length}, lastTick=${ir.meta.lastTick}`,
	);
	return ir;
}
