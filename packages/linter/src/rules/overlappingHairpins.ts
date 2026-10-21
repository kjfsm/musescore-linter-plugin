import { hairpinsOn, measureAt } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";

export const overlappingHairpins = defineRule({
  id: "overlapping-hairpins",
  meta: {
    name: "重なったヘアピン",
    description: "同じ譜表で前のヘアピンが終わる前に始まるヘアピンを検出",
    category: "dynamics",
    severity: "warning",
    tier: "recommended",
    docs: "同じ譜表で前のヘアピンが終わる前に次のヘアピンが始まっている",
  },
  options: {},
  messages: {
    overlapping: "前のヘアピンが終わる前に次のヘアピンが始まっています",
  },
  examples: {
    invalid: [
      {
        score: {
          hairpins: [
            { staff: 0, startTick: 0, endTick: 960 },
            { staff: 0, startTick: 480, endTick: 1440 },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          hairpins: [
            { staff: 0, startTick: 0, endTick: 960 },
            { staff: 0, startTick: 960, endTick: 1440 },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      let previous: { startTick: number; endTick: number } | null = null;
      for (const hp of hairpinsOn(score, staff)) {
        if (previous && hp.startTick < previous.endTick) {
          report({
            at: { staff, measure: measureAt(score, hp.startTick)?.serial ?? 0, tick: hp.startTick },
            messageId: "overlapping",
            detail: {
              previousStartTick: previous.startTick,
              previousEndTick: previous.endTick,
              startTick: hp.startTick,
              endTick: hp.endTick,
            },
          });
        }
        if (!previous || hp.endTick > previous.endTick) previous = hp;
      }
    }
  },
});
