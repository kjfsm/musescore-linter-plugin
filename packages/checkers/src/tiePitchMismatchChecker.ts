import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { buildPartNameMap, measureAtTick } from "./base/query.js";

// 異なる音高どうしをタイで結んでいる箇所を検出する。
// タイは同じ音高をつなぐ記号であり、異音程はスラーの書き間違いであることが多い。
// （音高データは meta.ties に SDK 経由で載る。snapshot 側の配線が前提。）
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

		const partsByStaff = buildPartNameMap(ir);

		for (const tie of ir.meta?.ties ?? []) {
			if (tie.startPitch === null || tie.endPitch === null) continue;
			if (tie.startPitch === tie.endPitch) continue;

			const partName = partsByStaff.get(tie.staffIdx) ?? "";
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
