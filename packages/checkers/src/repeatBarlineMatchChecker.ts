import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

// リピート開始(‖:)に対応する終了(:‖)が無い箇所を検出する。
// 終了リピート単独は「曲頭からの反復」として正当なので検出しない。
// 開始しっぱなし（対応する終了が現れない）だけを記譜ミスとして報告する。
export const repeatBarlineMatchChecker: Checker = {
	id: "repeat-barline-match",
	name: "リピート小節線の対応",
	description:
		"リピート開始(‖:)に対応する終了(:‖)が無い箇所を検出（終了のみは曲頭からの反復として許容）",
	category: "notation",
	severity: "warning",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;
		if (!ir.meta?.parts?.length) return issues;

		// リピート小節線はシステム全体に効くため、先頭スタッフのみを見て重複報告を避ける
		const staff = ir.meta.parts[0];
		const byStaff = ir.index.byStaffAndKind[staff.staffIdx] ?? {};
		const barlineIds = byStaff[canonical.elementKinds.BAR_LINE] ?? [];
		if (barlineIds.length === 0) return issues;

		const { REPEAT_START, REPEAT_END, REPEAT_BOTH } = canonical.barlineKinds;
		const bars = barlineIds
			.map((id) => ir.events[id])
			.sort((a, b) => a.tick - b.tick);

		let openStart: { measure: number; tick: number } | null = null;
		const flagUnclosed = (s: { measure: number; tick: number }): void => {
			issues.push(
				createIssue(repeatBarlineMatchChecker, {
					message: `リピート開始（${s.measure}小節目）に対応する終了リピートがありません`,
					partName: staff.partName,
					staffIdx: staff.staffIdx,
					measure: s.measure,
					tick: s.tick,
				}),
			);
		};

		for (const ev of bars) {
			const kind = ev.barlineKind;
			if (kind === REPEAT_START) {
				if (openStart) flagUnclosed(openStart);
				openStart = { measure: ev.measure, tick: ev.tick };
			} else if (kind === REPEAT_END) {
				openStart = null;
			} else if (kind === REPEAT_BOTH) {
				// 終了部分が直前の開始を閉じ、開始部分が新たな繰り返しを開く
				openStart = { measure: ev.measure, tick: ev.tick };
			}
		}
		if (openStart) flagUnclosed(openStart);
		return issues;
	},
};
