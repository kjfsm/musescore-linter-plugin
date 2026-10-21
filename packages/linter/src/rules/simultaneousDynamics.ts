import type { Annotation } from "@score-linter/score-model";
import { normalizeText } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { directiveOf } from "./support/common.ts";
import { dynamicsOn } from "./support/dynamics.ts";

export const simultaneousDynamics = defineRule({
  id: "simultaneous-dynamics",
  meta: {
    name: "同時ダイナミクスの衝突",
    description: "同じ位置で強弱記号が矛盾する箇所を検出",
    category: "dynamics",
    severity: "warning",
    tier: "recommended",
    docs: "同じ位置に異なる強弱記号が同時に付いている",
  },
  options: {},
  messages: {
    conflicting: "同じ位置に異なるダイナミクスが同時に付いています（{texts}）",
  },
  examples: {
    invalid: [
      {
        score: {
          annotations: [
            { staff: 0, tick: 0, text: "f", kind: "dynamic" },
            { staff: 0, tick: 0, text: "p", kind: "dynamic" },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, tick: 0, text: "f", kind: "dynamic" },
            { staff: 0, tick: 0, text: "f espr.", kind: "dynamic" },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    // 修飾語は比べない。「f」と「f espr.」が同じ位置にあるのは衝突ではない。
    const identity = (a: Annotation) => {
      const dynamic = directiveOf(a, "dynamic");
      return dynamic ? `mark:${dynamic.mark}` : `text:${normalizeText(a.text)}`;
    };
    for (const { index: staff } of score.staves) {
      const byTick = new Map<number, Annotation[]>();
      for (const a of dynamicsOn(score, staff)) {
        const group = byTick.get(a.tick);
        if (group) group.push(a);
        else byTick.set(a.tick, [a]);
      }
      const ticks = [...byTick.keys()].sort((a, b) => a - b);
      for (const tick of ticks) {
        const group = byTick.get(tick)!;
        const first = group[0]!;
        if (group.length < 2 || new Set(group.map(identity)).size < 2) continue;
        const texts = group.map((a) => a.text || "(?)");
        report({
          at: { staff, measure: first.measure, tick },
          messageId: "conflicting",
          data: { texts: texts.join(" / ") },
          detail: { dynamics: group.map((a) => a.text) },
        });
      }
    }
  },
});
