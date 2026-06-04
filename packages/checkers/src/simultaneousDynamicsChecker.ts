import type { Checker, Issue, LintEvent, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

// 同一パート・同一 tick に異なるダイナミクスが同時に置かれている矛盾を検出する。
// 例: 同じ音に f と p が両方付いている（コピペミス・置き換え漏れ）。
function dynamicIdentity(ev: LintEvent): string {
	if (ev.subtype !== null && ev.subtype !== undefined) {
		return `subtype:${String(ev.subtype)}`;
	}
	return `text:${ev.textNorm}`;
}

export const simultaneousDynamicsChecker: Checker = {
	id: "simultaneous-dynamics",
	name: "同時ダイナミクスの衝突",
	description:
		"同じパートの同じ位置(tick)に異なるダイナミクスが同時に付与されている矛盾を検出",
	category: "dynamics",
	severity: "warning",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const parts = ir.meta?.parts ?? [];
		for (const part of parts) {
			const byStaff = ir.index.byStaffAndKind[part.staffIdx] ?? {};
			const dynIds = byStaff[canonical.elementKinds.DYNAMIC] ?? [];

			const byTick: Record<number, LintEvent[]> = {};
			for (const id of dynIds) {
				const ev = ir.events[id];
				const group = byTick[ev.tick] ?? [];
				group.push(ev);
				byTick[ev.tick] = group;
			}

			for (const tickStr of Object.keys(byTick)) {
				const group = byTick[Number(tickStr)];
				if (group.length < 2) continue;
				const identities = new Set(group.map(dynamicIdentity));
				if (identities.size < 2) continue;

				const first = group[0];
				const labels = group
					.map((e) => e.textRaw || e.textNorm || "(?)")
					.join(" / ");
				issues.push(
					createIssue(simultaneousDynamicsChecker, {
						message: `${part.partName}: 同じ位置に異なるダイナミクスが同時に付いています（${first.measure}小節目: ${labels}）`,
						partName: part.partName,
						staffIdx: part.staffIdx,
						measure: first.measure,
						tick: first.tick,
						detail: { dynamics: group.map((e) => e.textRaw || e.textNorm) },
					}),
				);
			}
		}
		return issues;
	},
};
