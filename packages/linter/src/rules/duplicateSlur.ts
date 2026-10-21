import { measureAt } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";

export const duplicateSlur = defineRule({
  id: "duplicate-slur",
  meta: {
    name: "重複したスラー",
    description: "同じ範囲に重ねて掛けたスラーを検出",
    category: "slur-tie",
    severity: "info",
    tier: "recommended",
    docs: "同じ声部の同じ範囲にスラーが 2 本掛かっている",
  },
  options: {},
  messages: {
    duplicate: "同じ範囲にスラーが重ねて掛かっています",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }, { tick: 480 }],
          slurs: [
            { startTick: 0, endTick: 480 },
            { startTick: 0, endTick: 480 },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }, { tick: 480 }],
          slurs: [
            { startTick: 0, endTick: 480 },
            { voice: 1, startTick: 0, endTick: 480 },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    const seen = new Set<string>();
    for (const slur of score.slurs) {
      const key = `${slur.staff}:${slur.voice}:${slur.startTick}:${slur.endTick}`;
      if (!seen.has(key)) {
        seen.add(key);
        continue;
      }
      report({
        at: {
          staff: slur.staff,
          measure: measureAt(score, slur.startTick)?.serial ?? 0,
          tick: slur.startTick,
        },
        messageId: "duplicate",
        detail: { startTick: slur.startTick, endTick: slur.endTick },
      });
    }
  },
});
