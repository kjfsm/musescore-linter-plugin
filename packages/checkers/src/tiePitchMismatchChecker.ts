import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";

// 異なる音高どうしをタイで結んでいる箇所を検出する。
// タイは同じ音高をつなぐ記号であり、異音程はスラーの書き間違いであることが多い。
// （音高データは meta.ties に SDK 経由で載る。snapshot 側の配線が前提。）
function measureAtTick(ir: LintIR, tick: number): number {
	const ids = ir.index.byTick[String(tick)] ?? [];
	for (const id of ids) {
		const ev = ir.events[id];
		if (ev.measure > 0) return ev.measure;
	}
	return 0;
}

export const tiePitchMismatchChecker: Checker = {
	id: "tie-pitch-mismatch",
	name: "異音程のタイ",
	description:
		"異なる音高どうしをタイで結んでいる箇所を検出（スラーの書き間違いの可能性）",
	category: "notation",
	severity: "warning",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];

		const partsByStaff: Record<number, string> = {};
		for (const p of ir.meta?.parts ?? []) partsByStaff[p.staffIdx] = p.partName;

		for (const tie of ir.meta?.ties ?? []) {
			if (tie.startPitch === null || tie.endPitch === null) continue;
			if (tie.startPitch === tie.endPitch) continue;

			const partName = partsByStaff[tie.staffIdx] ?? "";
			const measure = measureAtTick(ir, tie.startTick);
			issues.push(
				createIssue(tiePitchMismatchChecker, {
					message: `${partName}: 異なる音高がタイで結ばれています（${measure}小節目、${tie.startPitch}→${tie.endPitch}）。スラーの書き間違いの可能性があります`,
					partName,
					staffIdx: tie.staffIdx,
					measure,
					tick: tie.startTick,
					detail: { startPitch: tie.startPitch, endPitch: tie.endPitch },
				}),
			);
		}
		return issues;
	},
};
