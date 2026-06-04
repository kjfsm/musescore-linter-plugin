import type { LintEvent, LintIR } from "@musescore-linter/core";
import { getCanonical } from "./predicates.js";

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
