import { defineRule } from "../engine.ts";

const TOP_STAFF = 0;

export const finalBarline = defineRule({
  id: "final-barline",
  meta: {
    name: "終止線の確認",
    description: "曲末の最終小節線が終止線でない箇所を検出",
    category: "notation",
    severity: "info",
    tier: "recommended",
    docs: "曲末の最終 barline が終止線になっているか",
  },
  options: {},
  messages: {
    notFinal: "曲末が終止線になっていません",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }],
          barlines: [{ tick: 1920, measure: 4, kind: "other" }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }],
          barlines: [{ tick: 1920, measure: 4, kind: "final" }],
        },
      },
    ],
  },
  run({ score, report }) {
    const bars = score.staves[TOP_STAFF]?.barlines ?? [];
    const [head, ...rest] = bars;
    if (!head) return;
    const last = rest.reduce((best, bar) => (bar.tick > best.tick ? bar : best), head);
    if (last.kind === "final") return;
    report({
      at: { staff: TOP_STAFF, measure: last.measure, tick: last.tick },
      messageId: "notFinal",
    });
  },
});
