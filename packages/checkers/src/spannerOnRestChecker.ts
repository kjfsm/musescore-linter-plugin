import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";
import { buildPartNameMap, measureAtTick } from "./base/query.js";

// ヘアピン(cresc./dim.)やスラーの開始/終了 tick が、その staff で
// 「休符のみが存在し音符(chord)が無い」位置にある誤りを検出する。
// スパナーの端点は原則として音符に掛かるべきで、休符上の端点は浄書ミスであることが多い。
function tickSet(ir: LintIR, staffIdx: number, kind: string): Set<number> {
	const ids = ir.index.byStaffAndKind[staffIdx]?.[kind] ?? [];
	return new Set(ids.map((id) => ir.events[id].tick));
}

export const spannerOnRestChecker: Checker = {
	id: "spanner-on-rest",
	name: "休符上のスパナー端点",
	description:
		"ヘアピン(cresc./dim.)やスラーの端点が休符上にある箇所を検出（同 tick に音符があれば許容）",
	category: "notation",
	severity: "warning",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const restKind = canonical.elementKinds.REST;
		const chordKind = canonical.elementKinds.CHORD;

		const partsByStaff = buildPartNameMap(ir);

		// staff ごとに rest/chord の tick 集合を遅延構築してキャッシュ
		const restCache: Record<number, Set<number>> = {};
		const chordCache: Record<number, Set<number>> = {};
		const restTicks = (staffIdx: number): Set<number> =>
			(restCache[staffIdx] ??= tickSet(ir, staffIdx, restKind));
		const chordTicks = (staffIdx: number): Set<number> =>
			(chordCache[staffIdx] ??= tickSet(ir, staffIdx, chordKind));

		// 休符のみ（音符なし）の位置か
		const onRestOnly = (staffIdx: number, tick: number): boolean =>
			restTicks(staffIdx).has(tick) && !chordTicks(staffIdx).has(tick);

		const report = (
			label: string,
			staffIdx: number,
			endpoint: "開始" | "終了",
			tick: number,
			detail: Record<string, unknown>,
		): void => {
			const partName = partsByStaff.get(staffIdx) ?? "";
			const measure = measureAtTick(ir, tick);
			issues.push(
				createIssue(spannerOnRestChecker, {
					message: `${partName}: ${label}の${endpoint}端点が休符上にあります（${measure}小節目）`,
					partName,
					staffIdx,
					measure,
					tick,
					detail,
				}),
			);
		};

		for (const hp of ir.meta?.hairpins ?? []) {
			const detail = {
				kind: "hairpin",
				startTick: hp.startTick,
				endTick: hp.endTick,
			};
			if (onRestOnly(hp.staffIdx, hp.startTick))
				report("ヘアピン", hp.staffIdx, "開始", hp.startTick, detail);
			if (onRestOnly(hp.staffIdx, hp.endTick))
				report("ヘアピン", hp.staffIdx, "終了", hp.endTick, detail);
		}

		for (const sl of ir.meta?.slurs ?? []) {
			const detail = {
				kind: "slur",
				startTick: sl.startTick,
				endTick: sl.endTick,
			};
			if (onRestOnly(sl.staffIdx, sl.startTick))
				report("スラー", sl.staffIdx, "開始", sl.startTick, detail);
			if (onRestOnly(sl.staffIdx, sl.endTick))
				report("スラー", sl.staffIdx, "終了", sl.endTick, detail);
		}

		return issues;
	},
};
