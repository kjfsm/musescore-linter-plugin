import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";
import {
	articulationsOf,
	chordsIn,
	slurCoversTick,
	staffGroupsSharingRhythm,
} from "./base/query.js";

// 主声部のみ比較する（多声部の比較は将来）。
const VOICE = 0;

/**
 * 小節×声部の chord 位置ごとに「スラー被覆 + アーティキュレーション集合」を直列化したプロファイル。
 * 同じリズムなら chord の tick が揃うので、プロファイルが一致すれば記号も一致しているとみなせる。
 */
function profileOf(ir: LintIR, staffIdx: number, measure: number): string {
	return chordsIn(ir, staffIdx, measure, VOICE)
		.map((ch) => {
			const arts = articulationsOf(ir, ch.id).slice().sort().join("+");
			const slur = slurCoversTick(ir, staffIdx, VOICE, ch.tick) ? "S" : "-";
			return `${ch.tick}:${slur}:${arts}`;
		})
		.join("|");
}

function partName(ir: LintIR, staffIdx: number): string {
	return (
		ir.meta?.parts?.find((p) => p.staffIdx === staffIdx)?.partName ??
		`Staff ${staffIdx + 1}`
	);
}

export const articulationSlurConsistencyChecker: Checker = {
	id: "articulation-slur-consistency",
	name: "同リズム間のスラー/アーティキュレーション整合",
	description:
		"同じ小節で同じリズムのパート間で、スラーの有無やアーティキュレーションが食い違っていないかを確認（最終判断は編曲方針による）",
	category: "articulation",
	severity: "info",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const measures = new Set<number>();
		for (const id of ir.index?.byKind?.[canonical.elementKinds.CHORD] ?? []) {
			const ev = ir.events[id];
			if (ev.voice === VOICE) measures.add(ev.measure);
		}

		for (const measure of measures) {
			for (const group of staffGroupsSharingRhythm(ir, measure, VOICE)) {
				const refStaff = group[0];
				const refProfile = profileOf(ir, refStaff, measure);
				for (const staffIdx of group.slice(1)) {
					if (profileOf(ir, staffIdx, measure) === refProfile) continue;
					const chords = chordsIn(ir, staffIdx, measure, VOICE);
					issues.push(
						createIssue(articulationSlurConsistencyChecker, {
							message: `小節 ${measure}: ${partName(ir, staffIdx)} は ${partName(ir, refStaff)} と同じリズムですが、スラー/アーティキュレーションが異なります`,
							partName: partName(ir, staffIdx),
							staffIdx,
							measure,
							tick: chords[0]?.tick ?? 0,
							detail: { comparedToStaffIdx: refStaff },
						}),
					);
				}
			}
		}
		return issues;
	},
};
