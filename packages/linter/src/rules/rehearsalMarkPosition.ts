import { measureBySerial } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { ofKind } from "./support/common.ts";

export const rehearsalMarkPosition = defineRule({
  id: "rehearsal-mark-position",
  meta: {
    name: "リハーサルマークの位置",
    description: "小節の頭に無いリハーサルマークを検出",
    category: "notation",
    severity: "info",
    tier: "pedantic",
    docs: "リハーサルマークが小節の頭に無い",
  },
  options: {},
  messages: {
    notAtStart: "リハーサルマーク「{label}」が小節の頭にありません",
  },
  examples: {
    invalid: [
      {
        score: {
          measures: [{}, {}],
          chords: [{ tick: 0 }],
          annotations: [{ tick: 2400, text: "A", kind: "rehearsal" }],
        },
      },
    ],
    valid: [
      {
        score: {
          measures: [{}, {}],
          chords: [{ tick: 0 }],
          annotations: [{ tick: 1920, text: "A", kind: "rehearsal" }],
        },
      },
    ],
  },
  run({ score, report }) {
    const seen = new Set<number>();
    for (const a of ofKind(score.annotations, "rehearsal")) {
      if (seen.has(a.tick)) continue;
      seen.add(a.tick);
      const measure = measureBySerial(score, a.measure);
      if (!measure || measure.startTick === a.tick) continue;
      report({
        at: { measure: a.measure, tick: a.tick },
        messageId: "notAtStart",
        data: { label: a.text.trim() },
        detail: { measureStartTick: measure.startTick },
      });
    }
  },
});
