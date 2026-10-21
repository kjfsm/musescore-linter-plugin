import { measureAt } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";

export const tiePitchMismatch = defineRule({
  id: "tie-pitch-mismatch",
  meta: {
    name: "異音程のタイ",
    description: "異なる音高をタイで結んでいる箇所を検出",
    category: "slur-tie",
    severity: "warning",
    tier: "recommended",
    docs: "異なる音高をタイで結んでいる（スラーの書き間違いの可能性）",
  },
  options: {},
  messages: {
    mismatch:
      "異なる音高がタイで結ばれています（{startPitch}→{endPitch}）。スラーの書き間違いの可能性があります",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }],
          ties: [{ startTick: 0, endTick: 480, startPitch: 60, endPitch: 62 }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }],
          ties: [{ startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const tie of score.ties) {
      if (tie.startPitch === null || tie.endPitch === null) continue;
      if (tie.startPitch === tie.endPitch) continue;
      report({
        at: {
          staff: tie.staff,
          measure: measureAt(score, tie.startTick)?.serial ?? 0,
          tick: tie.startTick,
        },
        messageId: "mismatch",
        data: { startPitch: tie.startPitch, endPitch: tie.endPitch },
        detail: { startPitch: tie.startPitch, endPitch: tie.endPitch },
      });
    }
  },
});
