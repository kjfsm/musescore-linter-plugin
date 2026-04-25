import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical, isDynamicMark } from "./base/predicates.js";

export const firstNoteDynamicsChecker: Checker = {
	id: "first-note-dynamics",
	name: "各パート冒頭ダイナミクス",
	description:
		"各パートの1音目にダイナミクスが付いているかを確認（未記載は不受理）",
	category: "dynamics",
	severity: "error",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		if (!ir.meta?.parts) return issues;

		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const firstChordByStaff = ir.derived?.firstChordByStaff ?? {};

		for (const staff of ir.meta.parts) {
			const firstChord = firstChordByStaff[staff.staffIdx];
			if (!firstChord) continue;

			let hasDynamics = false;

			// staff-scoped events at firstChord.tick
			const tickIds = ir.index.byTick[String(firstChord.tick)] ?? [];
			for (const id of tickIds) {
				const tev = ir.events[id];
				if (tev.staffIdx !== staff.staffIdx) continue;
				if (isDynamicMark(tev, ir)) {
					hasDynamics = true;
					break;
				}
			}

			// global scope events at firstChord.tick
			if (!hasDynamics) {
				const globalIds = ir.index.byStaff["-1"] ?? [];
				for (const id of globalIds) {
					const gev = ir.events[id];
					if (gev.tick !== firstChord.tick) continue;
					if (isDynamicMark(gev, ir)) {
						hasDynamics = true;
						break;
					}
				}
			}

			if (!hasDynamics) {
				issues.push(
					createIssue(firstNoteDynamicsChecker, {
						message: `${staff.partName}: 1音目にダイナミクスがありません`,
						partName: staff.partName,
						staffIdx: staff.staffIdx,
						measure: firstChord.measure,
						tick: firstChord.tick,
					}),
				);
			}
		}
		return issues;
	},
};
