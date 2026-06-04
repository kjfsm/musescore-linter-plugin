import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

// ヘアピン(cresc./dim.)の到達先にダイナミクスが無い箇所を検出する。
// 浄書では crescendo/diminuendo は原則「どの強さへ向かうか」を終端のダイナミクスで示す。
function hasDynamicAtTick(
	ir: LintIR,
	staffIdx: number,
	dynamicKind: string,
	tick: number,
): boolean {
	const onStaff = ir.index.byStaffAndKind[staffIdx]?.[dynamicKind] ?? [];
	if (onStaff.some((id) => ir.events[id].tick === tick)) return true;
	// global scope（全パート共通）のダイナミクスも到達先として認める
	const global = ir.index.byStaffAndKind[-1]?.[dynamicKind] ?? [];
	return global.some((id) => ir.events[id].tick === tick);
}

function measureAtTick(ir: LintIR, tick: number): number {
	const ids = ir.index.byTick[String(tick)] ?? [];
	for (const id of ids) {
		const ev = ir.events[id];
		if (ev.measure > 0) return ev.measure;
	}
	return 0;
}

export const hairpinTargetDynamicChecker: Checker = {
	id: "hairpin-target-dynamic",
	name: "ヘアピンの到達先ダイナミクス",
	description:
		"crescendo/diminuendo(ヘアピン)の終端に到達先のダイナミクスが無い箇所を検出",
	category: "dynamics",
	severity: "warning",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const dynamicKind = canonical.elementKinds.DYNAMIC;
		const partsByStaff: Record<number, string> = {};
		for (const p of ir.meta?.parts ?? []) partsByStaff[p.staffIdx] = p.partName;

		for (const hp of ir.meta?.hairpins ?? []) {
			if (hasDynamicAtTick(ir, hp.staffIdx, dynamicKind, hp.endTick)) continue;

			const partName = partsByStaff[hp.staffIdx] ?? "";
			const measure = measureAtTick(ir, hp.endTick);
			issues.push(
				createIssue(hairpinTargetDynamicChecker, {
					message: `${partName}: ヘアピンの到達先にダイナミクスがありません（${measure}小節目）`,
					partName,
					staffIdx: hp.staffIdx,
					measure,
					tick: hp.endTick,
					detail: { startTick: hp.startTick, endTick: hp.endTick },
				}),
			);
		}
		return issues;
	},
};
