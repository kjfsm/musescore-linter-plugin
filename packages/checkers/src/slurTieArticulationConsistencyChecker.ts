import type { Checker, CheckerOptionSpec, Issue, LintIR } from "@musescore-linter/core";
import { createIssue, resolveCheckerOptions } from "@musescore-linter/core";

import { bracketGroupKeyOf } from "./base/partGroups.js";
import { getCanonical } from "./base/predicates.js";
import {
  articulationsOf,
  buildPartNameMap,
  chordsIn,
  normalizeArticulationName,
  slurCoversTick,
  staffGroupsSharingRhythm,
  tieCoversTick,
} from "./base/query.js";

// 主声部のみ比較する（多声部の比較は将来）。
const VOICE = 0;

/**
 * 小節×声部の chord 位置ごとに「スラー被覆 + タイ被覆 + アーティキュレーション集合」を直列化したプロファイル。
 * 同じリズムなら chord の tick が揃うので、プロファイルが一致すれば記号も一致しているとみなせる。
 */
function profileOf(ir: LintIR, staffIdx: number, measure: number): string {
  return chordsIn(ir, staffIdx, measure, VOICE)
    .map((ch) => {
      const arts = articulationsOf(ir, ch.id).map(normalizeArticulationName).sort().join("+");
      const slur = slurCoversTick(ir, staffIdx, VOICE, ch.tick) ? "S" : "-";
      const tie = tieCoversTick(ir, staffIdx, VOICE, ch.tick) ? "T" : "-";
      return `${ch.tick}:${slur}:${tie}:${arts}`;
    })
    .join("|");
}

const OPTIONS: CheckerOptionSpec[] = [
  {
    key: "scope",
    label: "比較範囲",
    description:
      "スコアの括弧（システムブラケット）で比較相手を絞るか。括弧が無いスコアでは全パートに戻る",
    type: "select",
    choices: [
      { value: "all", label: "全パート" },
      { value: "group", label: "括弧内のみ" },
    ],
    default: "all",
  },
  {
    key: "groupSymbols",
    label: "対象の括弧",
    description:
      "「括弧内のみ」のときに区切りとして使う括弧の種類。譜表を覆う最小の括弧が採用される",
    type: "multiselect",
    choices: [
      { value: "bracket", label: "角括弧（楽器群）" },
      { value: "square", label: "括弧（1st/2nd のペア）" },
      // brace はピアノ・ハープの大譜表に既定で付くため、含めると同一楽器の
      // 右手 vs 左手が比較されてノイズになる。既定では選ばない。
      { value: "brace", label: "大括弧（大譜表）" },
      { value: "line", label: "縦線" },
    ],
    default: ["bracket", "square"],
  },
];

export const slurTieArticulationConsistencyChecker: Checker = {
  id: "slur-tie-articulation-consistency",
  name: "同リズム間のスラー/タイ/アーティキュレーション整合",
  description: "同リズムのパート間でスラー・タイ・アーティキュレーションの食い違いを検出",
  category: "articulation",
  severity: "info",
  defaultEnabled: true,
  options: OPTIONS,
  run(ir: LintIR, rawOptions?: Record<string, unknown>): Issue[] {
    const issues: Issue[] = [];
    const canonical = getCanonical(ir);
    if (!canonical) return issues;

    const opts = resolveCheckerOptions(OPTIONS, rawOptions);
    const symbols = Array.isArray(opts.groupSymbols) ? opts.groupSymbols : [];
    // groupKeyOf が null なら全パート横断（scope が all、または該当する括弧がスコアに無い）。
    const groupKeyOf = opts.scope === "group" ? bracketGroupKeyOf(ir, symbols) : null;
    const partNames = buildPartNameMap(ir);
    const partName = (staffIdx: number): string =>
      partNames.get(staffIdx) ?? `Staff ${staffIdx + 1}`;

    const measures = new Set<number>();
    for (const id of ir.index?.byKind?.[canonical.elementKinds.CHORD] ?? []) {
      const ev = ir.events[id];
      if (ev.voice === VOICE) measures.add(ev.measure);
    }

    for (const measure of measures) {
      for (const group of staffGroupsSharingRhythm(ir, measure, VOICE, groupKeyOf ?? undefined)) {
        const refStaff = group[0];
        const refProfile = profileOf(ir, refStaff, measure);
        for (const staffIdx of group.slice(1)) {
          if (profileOf(ir, staffIdx, measure) === refProfile) continue;
          const chords = chordsIn(ir, staffIdx, measure, VOICE);
          issues.push(
            createIssue(slurTieArticulationConsistencyChecker, {
              message: `小節 ${measure}: ${partName(staffIdx)} は ${partName(refStaff)} と同じリズムですが、スラー/タイ/アーティキュレーションが異なります`,
              partName: partName(staffIdx),
              staffIdx,
              measure,
              tick: chords[0]?.tick ?? 0,
              detail: {
                comparedToStaffIdx: refStaff,
                // なぜこの 2 パートが比較されたかを追えるようにしておく。ユーザーが要求した値では
                // なく**実際に使われた**範囲なので、group 指定でも括弧が無ければ "all" になる。
                scope: groupKeyOf ? "group" : "all",
                ...(groupKeyOf ? { partGroup: groupKeyOf(staffIdx) } : {}),
              },
            }),
          );
        }
      }
    }
    return issues;
  },
};
