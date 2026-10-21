import { lastTick, measureAt } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { dynamicsAffecting } from "./support/dynamics.ts";

export const hairpinTargetDynamic = defineRule({
  id: "hairpin-target-dynamic",
  meta: {
    name: "ヘアピンの到達先ダイナミクス",
    description: "ヘアピンの到達先にダイナミクスが無い箇所を検出",
    category: "dynamics",
    severity: "info",
    tier: "recommended",
    docs: "crescendo/diminuendo の終端に到達先のダイナミクスが無い（曲尾のヘアピンは除外）",
  },
  options: {},
  messages: {
    missing: "ヘアピンの到達先にダイナミクスがありません",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }, { tick: 480 }, { tick: 960 }],
          hairpins: [{ startTick: 0, endTick: 480 }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }, { tick: 480 }, { tick: 960 }],
          annotations: [{ staff: 0, tick: 480, measure: 2, text: "ff", kind: "dynamic" }],
          hairpins: [{ startTick: 0, endTick: 480 }],
        },
      },
    ],
  },
  run({ score, report }) {
    const end = lastTick(score);
    for (const hp of score.hairpins) {
      if (dynamicsAffecting(score, hp.staff).some((a) => a.tick === hp.endTick)) continue;
      // 曲尾まで伸びるヘアピン（dim. al niente など）は到達先を持たないのが普通
      if (hp.endTick >= end) continue;
      report({
        at: {
          staff: hp.staff,
          measure: measureAt(score, hp.endTick)?.serial ?? 0,
          tick: hp.endTick,
        },
        messageId: "missing",
        detail: { startTick: hp.startTick, endTick: hp.endTick },
      });
    }
  },
});
