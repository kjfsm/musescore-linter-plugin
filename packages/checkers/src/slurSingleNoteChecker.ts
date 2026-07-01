import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { buildPartNameMap, measureAtTick } from "./base/query.js";

// スラーが単一音（開始 tick == 終了 tick）に掛かっている箇所を検出する。
// スラーは複数音を繋ぐフレージング記号であり、単一音のスラーは記譜ミスの可能性が高い。
export const slurSingleNoteChecker: Checker = {
	id: "slur-single-note",
	name: "単一音スラー",
	description:
		"スラーが単一音（開始 tick == 終了 tick）に掛かっている箇所を検出",
	category: "notation",
	severity: "info",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];

		const partsByStaff = buildPartNameMap(ir);

		for (const slur of ir.meta?.slurs ?? []) {
			if (slur.startTick !== slur.endTick) continue;

			const partName = partsByStaff.get(slur.staffIdx) ?? "";
			const measure = measureAtTick(ir, slur.startTick);
			issues.push(
				createIssue(slurSingleNoteChecker, {
					message: `${partName}: スラーが単一音に掛かっています（${measure}小節目）`,
					partName,
					staffIdx: slur.staffIdx,
					measure,
					tick: slur.startTick,
					detail: { startTick: slur.startTick, endTick: slur.endTick },
				}),
			);
		}
		return issues;
	},
};
