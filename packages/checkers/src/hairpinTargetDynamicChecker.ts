import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";
import { buildPartNameMap, measureAtTick } from "./base/query.js";

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

export const hairpinTargetDynamicChecker: Checker = {
	id: "hairpin-target-dynamic",
	name: "ヘアピンの到達先ダイナミクス",
	description:
		"crescendo/diminuendo(ヘアピン)の終端に到達先のダイナミクスが無い箇所を検出（曲尾のヘアピンは除外）",
	category: "dynamics",
	severity: "info",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const dynamicKind = canonical.elementKinds.DYNAMIC;
		const lastTick = ir.meta?.lastTick ?? 0;
		const partsByStaff = buildPartNameMap(ir);

		for (const hp of ir.meta?.hairpins ?? []) {
			if (hasDynamicAtTick(ir, hp.staffIdx, dynamicKind, hp.endTick)) continue;
			// 曲尾まで伸びるヘアピン（dim. al niente 等）は到達先ダイナミクスを持たないのが普通
			if (hp.endTick >= lastTick) continue;

			const partName = partsByStaff.get(hp.staffIdx) ?? "";
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
