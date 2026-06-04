import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

// リハーサルマーク(A, B, C... または 1, 2, 3...)が昇順に並んでいるか、重複が無いかを検査する。
// A→C と飛ぶ(B 欠番)や、C の後に A が出る(順序逆)、同じ記号の重複を検出。
function rankOf(label: string): number | null {
	const t = label.trim();
	if (t.length === 0) return null;
	if (/^\d+$/.test(t)) return Number(t);
	const up = t.toUpperCase();
	if (/^[A-Z]+$/.test(up)) {
		// A=1..Z=26, AA=27, BB=28... の繰り返し表記と、AB 等の base-26 の両方に対応
		const allSame = up.split("").every((c) => c === up[0]);
		if (allSame) {
			return (up.length - 1) * 26 + (up.charCodeAt(0) - 64);
		}
		let n = 0;
		for (const c of up) n = n * 26 + (c.charCodeAt(0) - 64);
		return n;
	}
	return null;
}

export const rehearsalMarkOrderChecker: Checker = {
	id: "rehearsal-mark-order",
	name: "リハーサルマークの順序",
	description:
		"リハーサルマークが昇順に並んでいるか、重複していないかを検査（順序逆転・重複を検出）",
	category: "notation",
	severity: "info",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const ids = ir.index.byKind[canonical.elementKinds.REHEARSAL_MARK] ?? [];
		if (ids.length === 0) return issues;

		// 複数スタッフに同じマークが同 tick で現れる場合があるので (tick|label) で重複排除
		const seenKey = new Set<string>();
		const marks = ids
			.map((id) => ir.events[id])
			.sort((a, b) => a.tick - b.tick)
			.map((ev) => ({ label: (ev.textRaw || ev.textNorm).trim(), ev }))
			.filter((m) => {
				if (m.label.length === 0) return false;
				const key = `${m.ev.tick}|${m.label.toLowerCase()}`;
				if (seenKey.has(key)) return false;
				seenKey.add(key);
				return true;
			});

		const seenLabels = new Set<string>();
		let lastRank: number | null = null;
		let lastLabel = "";

		for (const { label, ev } of marks) {
			const norm = label.toLowerCase();
			if (seenLabels.has(norm)) {
				// 重複は重複として 1 件だけ報告し、順序判定からは除外する
				issues.push(
					createIssue(rehearsalMarkOrderChecker, {
						message: `リハーサルマーク「${label}」が重複しています（${ev.measure}小節目）`,
						partName: "",
						staffIdx: -1,
						measure: ev.measure,
						tick: ev.tick,
						detail: { label },
					}),
				);
				continue;
			}
			seenLabels.add(norm);

			const rank = rankOf(label);
			if (rank !== null && lastRank !== null && rank <= lastRank) {
				issues.push(
					createIssue(rehearsalMarkOrderChecker, {
						message: `リハーサルマークの順序が逆転しています（${ev.measure}小節目: 「${lastLabel}」の後に「${label}」）`,
						partName: "",
						staffIdx: -1,
						measure: ev.measure,
						tick: ev.tick,
						detail: { previous: lastLabel, current: label },
					}),
				);
			}
			if (rank !== null) {
				lastRank = rank;
				lastLabel = label;
			}
		}
		return issues;
	},
};
