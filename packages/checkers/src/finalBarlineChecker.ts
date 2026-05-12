import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

export const finalBarlineChecker: Checker = {
	id: "final-barline",
	name: "終止線の確認",
	description:
		"曲末の最終 barline が終止線（final barline）になっているかを確認",
	category: "notation",
	severity: "info",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;
		if (!ir.meta?.parts?.length) return issues;

		const staff = ir.meta.parts[0];
		const byStaff = ir.index.byStaffAndKind[staff.staffIdx] ?? {};
		const barlineIds = byStaff[canonical.elementKinds.BAR_LINE] ?? [];
		if (barlineIds.length === 0) return issues;

		const lastBarline = barlineIds
			.map((id) => ir.events[id])
			.reduce((best, ev) => (ev.tick > best.tick ? ev : best));

		// barlineKind が UNKNOWN または未設定の場合は MuseScore 4 が barLineType を
		// 返さない暗黙的な barline（終止線を含む）なので、false positive を避けるため pass する
		if (
			!lastBarline.barlineKind ||
			lastBarline.barlineKind === canonical.barlineKinds.FINAL ||
			lastBarline.barlineKind === canonical.barlineKinds.UNKNOWN
		) {
			return issues;
		}

		issues.push(
			createIssue(finalBarlineChecker, {
				message: `曲末（${lastBarline.measure}小節目）が終止線になっていません`,
				partName: staff.partName,
				staffIdx: staff.staffIdx,
				measure: lastBarline.measure,
				tick: lastBarline.tick,
			}),
		);
		return issues;
	},
};
