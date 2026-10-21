import { measureAt } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { restOnlyEndpoints } from "./support/common.ts";

export const slurOnRest = defineRule({
  id: "slur-on-rest",
  meta: {
    name: "休符上のスラー端点",
    description: "スラーの端点が休符上にある箇所を検出",
    category: "slur-tie",
    severity: "warning",
    tier: "recommended",
    docs: "スラーの端点が休符上にある（同 tick に音符があれば許容）",
  },
  options: {},
  messages: {
    onRest: "スラーの{endpoint}端点が休符上にあります",
  },
  examples: {
    invalid: [
      {
        score: {
          rests: [{ tick: 0 }],
          chords: [{ tick: 480 }],
          slurs: [{ startTick: 0, endTick: 480 }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }, { tick: 480 }],
          slurs: [{ startTick: 0, endTick: 480 }],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const hit of restOnlyEndpoints(score, score.slurs, "slur")) {
      report({
        at: { staff: hit.staff, measure: measureAt(score, hit.tick)?.serial ?? 0, tick: hit.tick },
        messageId: "onRest",
        data: { endpoint: hit.endpoint },
        detail: hit.detail,
      });
    }
  },
});
