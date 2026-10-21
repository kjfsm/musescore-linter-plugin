import { measureAt } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";

export const slurSingleNote = defineRule({
  id: "slur-single-note",
  meta: {
    name: "単一音スラー",
    description: "単一音に掛かるスラーを検出",
    category: "slur-tie",
    severity: "info",
    tier: "pedantic",
    docs: "スラーが単一音（開始 tick == 終了 tick）に掛かっている",
  },
  options: {},
  messages: {
    singleNote: "スラーが単一音に掛かっています",
  },
  examples: {
    invalid: [{ score: { chords: [{ tick: 0 }], slurs: [{ startTick: 0, endTick: 0 }] } }],
    valid: [{ score: { chords: [{ tick: 0 }], slurs: [{ startTick: 0, endTick: 480 }] } }],
  },
  run({ score, report }) {
    for (const slur of score.slurs) {
      if (slur.startTick !== slur.endTick) continue;
      report({
        at: {
          staff: slur.staff,
          measure: measureAt(score, slur.startTick)?.serial ?? 0,
          tick: slur.startTick,
        },
        messageId: "singleNote",
        detail: { startTick: slur.startTick, endTick: slur.endTick },
      });
    }
  },
});
