import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical, isTempoMark } from "./base/predicates.js";

export const openingTempoChecker: Checker = {
	id: "opening-tempo",
	name: "冒頭テンポ表記",
	description: "曲頭にテンポ表記があるかを確認（未記載は不受理）",
	category: "tempo",
	severity: "error",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		if (!ir.meta?.parts?.length) return issues;

		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const staff = ir.meta.parts[0];
		const firstMusicTick =
			ir.meta.firstMusicTickByStaff[staff.staffIdx] ?? null;
		if (firstMusicTick === null) return issues;

		// staff-scoped tempo
		const byStaff = ir.index.byStaffAndKind[staff.staffIdx] ?? {};
		const tempoIds = byStaff[canonical.elementKinds.TEMPO_TEXT] ?? [];
		for (const id of tempoIds) {
			if (ir.events[id].tick <= firstMusicTick) return issues;
		}

		// global scope tempo
		const globalIds = ir.index.byStaff["-1"] ?? [];
		for (const id of globalIds) {
			const gev = ir.events[id];
			if (!isTempoMark(gev, ir)) continue;
			if (gev.tick <= firstMusicTick) return issues;
		}

		issues.push(
			createIssue(openingTempoChecker, {
				message: "冒頭にテンポ表記がありません",
				partName: staff.partName,
				staffIdx: 0,
				measure: 1,
				tick: firstMusicTick,
			}),
		);
		return issues;
	},
};
