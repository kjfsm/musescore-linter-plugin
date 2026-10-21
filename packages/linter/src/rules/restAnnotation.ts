import type { Technique } from "@score-linter/score-model";
import { annotationsOn, restTicks } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { ofKind, techniqueOf } from "./support/common.ts";

/** 休符に付いていたらおかしい奏法の指示。 */
const NOT_ON_REST = new Set<Technique>([
  "pizz",
  "arco",
  "con-sord",
  "senza-sord",
  "sul-tasto",
  "sul-pont",
  "col-legno",
  "solo",
  "tutti",
  "div",
  "unis",
  "ord",
]);

export const restAnnotation = defineRule({
  id: "rest-annotation",
  meta: {
    name: "休符アノテーション",
    description: "休符位置の不適切な注記を検出",
    category: "notation",
    severity: "error",
    tier: "recommended",
    docs: "休符の位置に演奏技法テキストが付与されていないか（ダイナミクスは info）",
  },
  options: {},
  messages: {
    onRest: '休符に不受理の注記 "{text}" が付与されています',
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }],
          rests: [{ tick: 480, measure: 2 }],
          annotations: [{ staff: 0, tick: 480, measure: 2, text: "pizz." }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }],
          annotations: [{ staff: 0, tick: 0, text: "pizz." }],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const rests = restTicks(score, staff);
      const onRest = annotationsOn(score, staff).filter((a) => rests.has(a.tick));
      const techniques = ofKind(onRest, "text").filter((a) => {
        const technique = techniqueOf(a);
        return technique !== undefined && NOT_ON_REST.has(technique);
      });
      for (const a of techniques) {
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          messageId: "onRest",
          data: { text: a.text },
        });
      }
      // 休符への強弱記号は音の受け渡しの表現として使われることもある
      for (const a of ofKind(onRest, "dynamic")) {
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          messageId: "onRest",
          data: { text: a.text },
          severity: "info",
        });
      }
    }
  },
});
