import { firstChord } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { dynamicsAffecting } from "./support/dynamics.ts";

export const firstNoteDynamics = defineRule({
  id: "first-note-dynamics",
  meta: {
    name: "各パート冒頭ダイナミクス",
    description: "各パート1音目のダイナミクス欠落を検出",
    category: "dynamics",
    severity: "error",
    tier: "recommended",
    docs: "各パートの 1 音目にダイナミクスがあるか",
  },
  options: {},
  messages: {
    missing: "1音目にダイナミクスがありません",
  },
  examples: {
    invalid: [{ score: { chords: [{ tick: 0 }] } }],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }],
          annotations: [{ staff: 0, tick: 0, text: "f", kind: "dynamic" }],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const chord = firstChord(score, staff);
      if (!chord) continue;
      if (dynamicsAffecting(score, staff).some((a) => a.tick === chord.tick)) continue;
      report({
        at: { staff, measure: chord.measure, tick: chord.tick },
        messageId: "missing",
      });
    }
  },
});
