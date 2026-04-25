import type { Checker, Issue, LintEvent, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

export const tempoBarlineChecker: Checker = {
	id: "tempo-barline",
	name: "テンポ変更と複縦線",
	description: "テンポ変更前の小節に複縦線があるかを確認",
	category: "tempo",
	severity: "info",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		if (!ir.meta?.parts?.length) return issues;

		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const staff = ir.meta.parts[0];
		const byStaff = ir.index.byStaffAndKind[staff.staffIdx] ?? {};

		const tempoIds = byStaff[canonical.elementKinds.TEMPO_TEXT] ?? [];
		const barlineIds = byStaff[canonical.elementKinds.BAR_LINE] ?? [];

		const barlines: Record<number, string> = {};
		const barlineEvents: LintEvent[] = [];
		for (const id of barlineIds) {
			const ev = ir.events[id];
			barlines[ev.measure] = ev.barlineKind ?? "";
			barlineEvents.push(ev);
		}

		let tempoEvents = tempoIds.map((id) => ir.events[id]);
		tempoEvents.sort((a, b) =>
			a.tick !== b.tick ? a.tick - b.tick : a.measure - b.measure,
		);
		barlineEvents.sort((a, b) =>
			a.tick !== b.tick ? a.tick - b.tick : a.measure - b.measure,
		);

		// 重複 tick を除去
		const seen = new Set<number>();
		tempoEvents = tempoEvents.filter((ev) => {
			if (seen.has(ev.tick)) return false;
			seen.add(ev.tick);
			return true;
		});

		const firstTempoTick = tempoEvents[0]?.tick ?? null;
		let prevTempoValue: number | null = null;
		let barlineCursor = -1;

		for (const tm of tempoEvents) {
			if (tm.tick === firstTempoTick) {
				prevTempoValue = tm.tempo;
				continue;
			}
			if (
				prevTempoValue !== null &&
				tm.tempo !== null &&
				tm.tempo === prevTempoValue
			)
				continue;
			prevTempoValue = tm.tempo;

			while (
				barlineCursor + 1 < barlineEvents.length &&
				barlineEvents[barlineCursor + 1].tick < tm.tick
			) {
				barlineCursor++;
			}
			const prevBarlineByTick =
				barlineCursor >= 0 ? barlineEvents[barlineCursor] : null;

			const prevMeasure = tm.measure - 1;
			const hasDoubleByMeasure =
				barlines[prevMeasure] === canonical.barlineKinds.DOUBLE;
			const hasDoubleByTick =
				prevBarlineByTick?.barlineKind === canonical.barlineKinds.DOUBLE;

			if (!hasDoubleByMeasure && !hasDoubleByTick) {
				issues.push(
					createIssue(tempoBarlineChecker, {
						message: `テンポ変更（${tm.textRaw}）の前の小節（${prevMeasure}小節目）に複縦線がありません`,
						partName: staff.partName,
						staffIdx: 0,
						measure: prevMeasure,
						tick: tm.tick,
					}),
				);
			}
		}
		return issues;
	},
};
