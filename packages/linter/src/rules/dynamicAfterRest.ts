import { chordsOnStaff, measureBySerial, stableSortBy } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { dynamicsAffecting, isDynamicChange } from "./support/dynamics.ts";

export const dynamicAfterRest = defineRule({
  id: "dynamic-after-rest",
  meta: {
    name: "休みのあとの強弱記号",
    description: "長く休んだあとの入りで強弱記号を言い直していない箇所を検出",
    category: "dynamics",
    severity: "info",
    tier: "nursery",
    docs: "長く休んだあとの入りで強弱記号を言い直していない（休みの長さを設定可、後述）",
  },
  // オプションの型に数値が無いので、休みの長さは選択肢から選ばせる
  options: {
    restMeasures: {
      type: "select",
      label: "休みの長さ",
      description: "この小節数以上、音の無い小節が続いたあとの入りを見る",
      choices: [
        { value: "2", label: "2 小節" },
        { value: "4", label: "4 小節" },
        { value: "8", label: "8 小節" },
      ],
      default: "4",
    },
  },
  messages: {
    missing: "{restMeasures} 小節休んだあとの入りに強弱記号がありません",
  },
  examples: {
    invalid: [
      {
        score: {
          measures: Array.from({ length: 12 }, () => ({})),
          chords: [
            { staff: 0, tick: 0 },
            { staff: 0, tick: 9600 },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          measures: Array.from({ length: 12 }, () => ({})),
          chords: [
            { staff: 0, tick: 0 },
            { staff: 0, tick: 9600 },
          ],
          annotations: [{ staff: 0, tick: 9600, measure: 6, text: "p", kind: "dynamic" }],
        },
      },
    ],
  },
  run({ score, options, report }) {
    const threshold = Number(options.restMeasures);
    for (const { index: staff } of score.staves) {
      const chords = stableSortBy(chordsOnStaff(score, staff), (a, b) => a.tick - b.tick);
      const dynamicTicks = dynamicsAffecting(score, staff)
        .filter((a) => !isDynamicChange(a))
        .map((a) => a.tick);
      let previousMeasure: number | null = null;
      for (const chord of chords) {
        const prev = previousMeasure;
        previousMeasure = chord.measure;
        if (prev === null || chord.measure - prev - 1 < threshold) continue;
        const restStart = measureBySerial(score, prev + 1)?.startTick ?? chord.tick;
        if (dynamicTicks.some((t) => t >= restStart && t <= chord.tick)) continue;
        report({
          at: { staff, measure: chord.measure, tick: chord.tick },
          messageId: "missing",
          data: { restMeasures: chord.measure - prev - 1 },
          detail: { restMeasures: chord.measure - prev - 1, previousMeasure: prev },
        });
      }
    }
  },
});
