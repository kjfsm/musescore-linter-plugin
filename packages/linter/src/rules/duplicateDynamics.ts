import type { Annotation } from "@score-linter/score-model";
import { hairpinsOn, normalizeText, stableSortBy } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { directiveOf } from "./support/common.ts";
import { dynamicsOn } from "./support/dynamics.ts";

// sf と rf はアクセントとして続けて使われることが多い
const CONSECUTIVE_ALLOWED = new Set(["sf", "rf"]);

export const duplicateDynamics = defineRule({
  id: "duplicate-dynamics",
  meta: {
    name: "重複ダイナミクス",
    description: "同じ強弱記号が変化なく連続する箇所を検出",
    category: "dynamics",
    severity: "info",
    tier: "pedantic",
    docs: "同パートで同じ強弱記号が変化なく連続している箇所（`sf`/`rf` の連続は許可）",
  },
  options: {},
  messages: {
    repeated: "{text} が変化なく連続しています（前回: {{measure:previousMeasure}}）",
  },
  examples: {
    invalid: [
      {
        score: {
          annotations: [
            { staff: 0, tick: 0, measure: 1, text: "f", kind: "dynamic" },
            { staff: 0, tick: 480, measure: 2, text: "f", kind: "dynamic" },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, tick: 0, measure: 1, text: "f", kind: "dynamic" },
            { staff: 0, tick: 480, measure: 2, text: "p", kind: "dynamic" },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const hairpins = hairpinsOn(score, staff);
      let previous: Annotation | null = null;
      // 記号（mark）ではなくテキスト全体で比べる。「f」のあとの「più f」は変化である。
      for (const a of stableSortBy(dynamicsOn(score, staff), (x, y) => x.tick - y.tick)) {
        const text = normalizeText(a.text);
        const prev: Annotation | null = previous;
        previous = a;
        if (!prev || text === "" || text !== normalizeText(prev.text)) continue;
        const dynamic = directiveOf(a, "dynamic");
        if (dynamic && dynamic.modifier === "" && CONSECUTIVE_ALLOWED.has(dynamic.mark)) continue;
        if (hairpins.some((h) => h.startTick >= prev.tick && h.startTick < a.tick)) continue;
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          messageId: "repeated",
          data: { text: a.text || "(同一)" },
          detail: { previousMeasure: prev.measure },
        });
      }
    }
  },
});
