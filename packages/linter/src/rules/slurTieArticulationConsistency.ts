import type { Score } from "@score-linter/score-model";
import { chordsIn, rhythmSignature, slursOn, spanCovers, tiesOn } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { bracketGroupKeyOf } from "./support/common.ts";

// 主声部だけを比べる
const VOICE = 0;

/**
 * 小節の和音ごとの「スラーに入るか・タイに入るか・アーティキュレーション」を 1 つの文字列に
 * したもの。同じリズムなら和音の tick が揃うので、この文字列が一致すれば記号も一致している。
 */
function profileOf(score: Score, staff: number, measure: number): string {
  const slurs = slursOn(score, staff);
  const ties = tiesOn(score, staff);
  return chordsIn(score, staff, VOICE, measure)
    .map((ch) => {
      const arts = [...ch.articulations].sort().join("+");
      const slur = spanCovers(slurs, VOICE, ch.tick) ? "S" : "-";
      const tie = spanCovers(ties, VOICE, ch.tick) ? "T" : "-";
      return `${ch.tick}:${slur}:${tie}:${arts}`;
    })
    .join("|");
}

/**
 * measure で同じリズムを持つ譜表の組（2 本以上）。`groupKeyOf` があれば、別の括弧の譜表は
 * 同じ組に入れず、null を返した譜表は外す。
 *
 * バケツを `groupKey → リズム` の 2 段にしているのは、リズムの文字列が長い（16 分主体の小節で
 * 数百文字）ため。連結したキーにすると「譜表数 × 小節数」回そのコピーとハッシュが走る。
 */
function staffGroupsSharingRhythm(
  score: Score,
  measure: number,
  groupKeyOf: ((staff: number) => string | null) | null,
): number[][] {
  const byGroup = new Map<string, Map<string, number[]>>();
  for (const { index: staff } of score.staves) {
    const groupKey = groupKeyOf ? groupKeyOf(staff) : "";
    if (groupKey === null) continue;
    const sig = rhythmSignature(score, staff, VOICE, measure);
    if (!sig) continue;
    let bySig = byGroup.get(groupKey);
    if (!bySig) {
      bySig = new Map();
      byGroup.set(groupKey, bySig);
    }
    const bucket = bySig.get(sig);
    if (bucket) bucket.push(staff);
    else bySig.set(sig, [staff]);
  }
  const out: number[][] = [];
  for (const bySig of byGroup.values()) {
    for (const group of bySig.values())
      if (group.length >= 2) out.push(group.sort((a, b) => a - b));
  }
  return out;
}

export const slurTieArticulationConsistency = defineRule({
  id: "slur-tie-articulation-consistency",
  meta: {
    name: "同リズム間のスラー/タイ/アーティキュレーション整合",
    description: "同リズムのパート間でスラー・タイ・アーティキュレーションの食い違いを検出",
    category: "articulation",
    severity: "info",
    tier: "pedantic",
    docs: "同じ小節で同じリズムのパート間でスラー・タイの有無やアーティキュレーションが食い違う（比較範囲を設定可、後述）",
  },
  messages: {
    differs:
      "{{part:comparedToStaffIdx}} と同じリズムですが、スラー/タイ/アーティキュレーションが異なります",
  },
  examples: {
    invalid: [
      {
        score: {
          parts: [{ name: "Vn1" }, { name: "Vn2" }],
          chords: [
            {
              staff: 0,
              tick: 0,
              duration: { numerator: 1, denominator: 4 },
              articulations: ["Staccato"],
            },
            { staff: 1, tick: 0, duration: { numerator: 1, denominator: 4 } },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          parts: [{ name: "Vn1" }, { name: "Vn2" }],
          chords: [
            {
              staff: 0,
              tick: 0,
              duration: { numerator: 1, denominator: 4 },
              articulations: ["Staccato"],
            },
            {
              staff: 1,
              tick: 0,
              duration: { numerator: 1, denominator: 4 },
              articulations: ["Staccato"],
            },
          ],
        },
      },
    ],
  },
  options: {
    scope: {
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
    groupSymbols: {
      label: "対象の括弧",
      description:
        "「括弧内のみ」のときに区切りとして使う括弧の種類。譜表を覆う最小の括弧が採用される",
      type: "multiselect",
      choices: [
        { value: "bracket", label: "角括弧（楽器群）" },
        { value: "square", label: "括弧（1st/2nd のペア）" },
        // ピアノ・ハープの大譜表に既定で付くので、選ぶと同じ楽器の右手と左手を比べてしまう
        { value: "brace", label: "大括弧（大譜表）" },
        { value: "line", label: "縦線" },
      ],
      default: ["bracket", "square"],
    },
  },
  run({ score, options, report }) {
    // null なら全パートをまたいで比べる（scope が all か、選んだ括弧が楽譜に無い）
    const groupKeyOf =
      options.scope === "group" ? bracketGroupKeyOf(score, options.groupSymbols) : null;

    const measures = new Set<number>();
    for (const staff of score.staves) {
      for (const e of staff.voices[VOICE]?.events ?? [])
        if (e.type === "chord") measures.add(e.measure);
    }

    for (const measure of measures) {
      for (const [reference, ...others] of staffGroupsSharingRhythm(score, measure, groupKeyOf)) {
        if (reference === undefined) continue;
        const expected = profileOf(score, reference, measure);
        for (const staff of others) {
          if (profileOf(score, staff, measure) === expected) continue;
          report({
            at: { staff, measure, tick: chordsIn(score, staff, VOICE, measure)[0]?.tick ?? 0 },
            messageId: "differs",
            detail: {
              comparedToStaffIdx: reference,
              // ユーザーが選んだ値ではなく実際に使った範囲。group を選んでも括弧が無ければ all。
              scope: groupKeyOf ? "group" : "all",
              ...(groupKeyOf ? { partGroup: groupKeyOf(staff) } : {}),
            },
          });
        }
      }
    }
  },
});
