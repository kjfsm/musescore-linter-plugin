import type { Checker, Issue, LintEvent, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

// テキスト式の cresc./dim. の後に到達先の強弱記号が現れない箇所を検出する。
// DYNAMIC kind には強弱記号(f/p/mf 等)とテキスト式の cresc./dim. の両方が含まれるため、
// kind ではなく textNorm のパターンで両者を区別する。
const CRESC_WORDS = new Set([
	"cresc.",
	"cresc",
	"crescendo",
	"dim.",
	"dim",
	"diminuendo",
	"decresc.",
	"decresc",
	"decrescendo",
	"dimin.",
]);

function isCrescText(ev: LintEvent): boolean {
	return CRESC_WORDS.has((ev.textNorm ?? "").toLowerCase().trim());
}

export const crescTextResolutionChecker: Checker = {
	id: "cresc-text-resolution",
	name: "cresc./dim. の到達先",
	description:
		"テキスト式 cresc./dim. の後に到達先の強弱記号が現れない箇所を検出（曲尾まで強弱記号が無いケース）",
	category: "dynamics",
	severity: "info",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const dynamicKind = canonical.elementKinds.DYNAMIC;

		// 後続の到達先候補（cresc 系でない実強弱記号）を tick 付きで集める。
		// 同 staff のものに加え、global scope(-1) の強弱記号も到達先として認める。
		const targetTicks = (staffIdx: number): number[] => {
			const ids = [
				...(ir.index.byStaffAndKind[staffIdx]?.[dynamicKind] ?? []),
				...(ir.index.byStaffAndKind[-1]?.[dynamicKind] ?? []),
			];
			const ticks: number[] = [];
			for (const id of ids) {
				const ev = ir.events[id];
				if (!isCrescText(ev)) ticks.push(ev.tick);
			}
			return ticks;
		};

		for (const staff of ir.meta?.parts ?? []) {
			const ids = ir.index.byStaffAndKind[staff.staffIdx]?.[dynamicKind] ?? [];
			const resolveTicks = targetTicks(staff.staffIdx);

			for (const id of ids) {
				const ev = ir.events[id];
				if (!isCrescText(ev)) continue;
				// 後続(tick がより後ろ)の強弱記号があれば解決済み
				if (resolveTicks.some((t) => t > ev.tick)) continue;

				issues.push(
					createIssue(crescTextResolutionChecker, {
						message: `${staff.partName}: "${ev.textRaw}" の後に到達先の強弱記号がありません（${ev.measure}小節目）`,
						partName: staff.partName,
						staffIdx: staff.staffIdx,
						measure: ev.measure,
						tick: ev.tick,
					}),
				);
			}
		}
		return issues;
	},
};
