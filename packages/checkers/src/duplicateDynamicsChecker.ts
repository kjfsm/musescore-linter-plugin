import type { Checker, Issue, LintEvent, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

function sameDynamic(a: LintEvent, b: LintEvent): boolean {
	if (
		a.subtype !== null &&
		a.subtype !== undefined &&
		b.subtype !== null &&
		b.subtype !== undefined
	) {
		return a.subtype === b.subtype;
	}
	if (a.textNorm !== "" && a.textNorm === b.textNorm) return true;
	return false;
}

export const duplicateDynamicsChecker: Checker = {
	id: "duplicate-dynamics",
	name: "重複ダイナミクス",
	description:
		"同パートで同じ強弱記号が変化なく連続している箇所を検出（subtype を優先比較）",
	category: "dynamics",
	severity: "info",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const parts = ir.meta?.parts ?? [];
		for (const part of parts) {
			const byStaff = ir.index.byStaffAndKind[part.staffIdx] ?? {};
			const dynIds = byStaff[canonical.elementKinds.DYNAMIC] ?? [];
			const dynEvents = dynIds
				.map((id) => ir.events[id])
				.sort((a, b) => a.tick - b.tick);

			let prev: LintEvent | null = null;
			for (const ev of dynEvents) {
				if (prev !== null && sameDynamic(prev, ev)) {
					const label = ev.textRaw || ev.textNorm || "(同一)";
					issues.push(
						createIssue(duplicateDynamicsChecker, {
							message: `${part.partName}: ${label} が変化なく連続しています（${ev.measure}小節目、前回: ${prev.measure}小節目）`,
							partName: part.partName,
							staffIdx: part.staffIdx,
							measure: ev.measure,
							tick: ev.tick,
							detail: { previousMeasure: prev.measure },
						}),
					);
				}
				prev = ev;
			}
		}
		return issues;
	},
};
