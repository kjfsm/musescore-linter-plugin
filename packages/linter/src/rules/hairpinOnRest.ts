import { measureAt } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { restOnlyEndpoints } from "./support/common.ts";

export const hairpinOnRest = defineRule({
  id: "hairpin-on-rest",
  meta: {
    name: "休符上のヘアピン端点",
    description: "ヘアピンの端点が休符上にある箇所を検出",
    category: "dynamics",
    // slur-on-rest（warning）とわざと非対称。休符に掛かるスラーは明確な誤りだが、
    // ヘアピンの端点が休符上に来るのは実務では珍しくない。
    severity: "info",
    tier: "pedantic",
    docs: "ヘアピン(cresc./dim.)の端点が休符上にある（同 tick に音符があれば許容）",
  },
  options: {},
  messages: {
    onRest: "ヘアピンの{endpoint}端点が休符上にあります",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }],
          rests: [{ tick: 480 }],
          hairpins: [{ startTick: 0, endTick: 480 }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }, { tick: 480 }],
          hairpins: [{ startTick: 0, endTick: 480 }],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const hit of restOnlyEndpoints(score, score.hairpins, "hairpin")) {
      report({
        at: { staff: hit.staff, measure: measureAt(score, hit.tick)?.serial ?? 0, tick: hit.tick },
        messageId: "onRest",
        data: { endpoint: hit.endpoint },
        detail: hit.detail,
      });
    }
  },
});
