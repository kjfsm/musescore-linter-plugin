import { tiesOn } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { staffChords, tieEnds } from "./support/common.ts";
import { dynamicsOn, isDynamicChange } from "./support/dynamics.ts";

export const tieContinuationDynamic = defineRule({
  id: "tie-continuation-dynamic",
  meta: {
    name: "タイで続く音の強弱記号",
    description: "タイで続くだけの音（新しく弾かない音）に付いた強弱記号を検出",
    category: "dynamics",
    // 持続中の強弱の変化として意図して書くこともある
    severity: "info",
    tier: "pedantic",
    docs: "タイで続くだけの音（新しく弾かない音）に強弱記号が付いている",
  },
  options: {},
  messages: {
    onContinuation: '強弱記号 "{text}" がタイで続くだけの音に付いています',
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [
            {
              staff: 0,
              tick: 480,
              notes: [{ pitch: 60, tpc: 14, line: 0, accidentalShown: false }],
            },
          ],
          ties: [{ staff: 0, startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
          annotations: [{ staff: 0, tick: 480, measure: 1, text: "p", kind: "dynamic" }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [
            {
              staff: 0,
              tick: 480,
              notes: [{ pitch: 60, tpc: 14, line: 0, accidentalShown: false }],
            },
          ],
          annotations: [{ staff: 0, tick: 480, measure: 1, text: "p", kind: "dynamic" }],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      if (tiesOn(score, staff).length === 0) continue;
      const chords = staffChords(score, staff);
      const ties = tieEnds(score, staff);
      const voiceCount = score.staves[staff]?.voices.length ?? 0;
      const onlyContinued = (tick: number): boolean => {
        let found = false;
        for (let voice = 0; voice < voiceCount; voice++) {
          const chord = chords.at(voice, tick);
          if (!chord) continue;
          if (!ties.allContinued(voice, chord)) return false;
          found = true;
        }
        return found;
      };
      for (const a of dynamicsOn(score, staff)) {
        // 持続音の上で cresc. や dim. を始めるのは正しい書き方
        if (isDynamicChange(a) || !onlyContinued(a.tick)) continue;
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          messageId: "onContinuation",
          data: { text: a.text },
        });
      }
    }
  },
});
