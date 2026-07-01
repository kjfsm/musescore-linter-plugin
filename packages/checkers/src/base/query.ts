import type { LintEvent, LintIR } from "@musescore-linter/core";
import { getCanonical } from "./predicates.js";

/** tick に対応する小節番号。見つからなければ 0。 */
export function measureAtTick(ir: LintIR, tick: number): number {
	const ids = ir.index.byTick[String(tick)] ?? [];
	for (const id of ids) {
		const ev = ir.events[id];
		if (ev.measure > 0) return ev.measure;
	}
	return 0;
}

/** staffIdx → partName のマップ。ir.meta.parts から構築する。 */
export function buildPartNameMap(ir: LintIR): Map<number, string> {
	const map = new Map<number, string>();
	for (const part of ir.meta?.parts ?? []) {
		map.set(part.staffIdx, part.partName);
	}
	return map;
}

/** (staff, measure, voice) の chord イベントを tick 昇順で返す。 */
export function chordsIn(
	ir: LintIR,
	staffIdx: number,
	measure: number,
	voice: number,
): LintEvent[] {
	const canonical = getCanonical(ir);
	if (!canonical) return [];
	const ids =
		ir.index?.byStaffAndKind?.[staffIdx]?.[canonical.elementKinds.CHORD] ?? [];
	return ids
		.map((id) => ir.events[id])
		.filter((ev) => ev.measure === measure && ev.voice === voice)
		.sort((a, b) => a.tick - b.tick);
}

/** (staff, measure, voice) のリズム署名。無ければ undefined。 */
export function rhythmSignature(
	ir: LintIR,
	staffIdx: number,
	measure: number,
	voice: number,
): string | undefined {
	return ir.derived?.rhythmByStaffMeasure?.[`${staffIdx}:${measure}:${voice}`];
}

/** chord イベントに付いたアーティキュレーション名（無ければ []）。 */
export function articulationsOf(ir: LintIR, chordId: number): string[] {
	return ir.derived?.articulationsByChordId?.[chordId] ?? [];
}

/**
 * MuseScore の subtypeName() は符尾方向により「上スタッカート」「下スタッカート」等の
 * 配置違いバリアントを返すが、音楽的には同一の記号なので比較時は接頭辞を除去して同一視する。
 */
export function normalizeArticulationName(name: string): string {
	return name.replace(/^[上下]/, "");
}

/** tick が staff/voice のスラーに含まれるか。 */
export function slurCoversTick(
	ir: LintIR,
	staffIdx: number,
	voice: number,
	tick: number,
): boolean {
	const slurs = ir.derived?.slursByStaff?.[staffIdx] ?? [];
	return slurs.some(
		(s) => s.voice === voice && s.startTick <= tick && tick < s.endTick,
	);
}

/** tick が staff/voice のタイに含まれるか。 */
export function tieCoversTick(
	ir: LintIR,
	staffIdx: number,
	voice: number,
	tick: number,
): boolean {
	const ties = ir.derived?.tiesByStaff?.[staffIdx] ?? [];
	return ties.some(
		(t) => t.voice === voice && t.startTick <= tick && tick < t.endTick,
	);
}

/** measure/voice で同じリズム署名を持つ staffIdx のグループ（サイズ >= 2）を返す。 */
export function staffGroupsSharingRhythm(
	ir: LintIR,
	measure: number,
	voice: number,
): number[][] {
	const bySig: Record<string, number[]> = {};
	for (const part of ir.meta?.parts ?? []) {
		const sig = rhythmSignature(ir, part.staffIdx, measure, voice);
		if (!sig) continue;
		if (!bySig[sig]) bySig[sig] = [];
		bySig[sig].push(part.staffIdx);
	}
	return Object.values(bySig)
		.filter((g) => g.length >= 2)
		.map((g) => g.sort((a, b) => a - b));
}
