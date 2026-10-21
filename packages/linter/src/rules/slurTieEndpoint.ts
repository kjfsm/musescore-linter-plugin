import { measureAt, slursOn, tiesOn } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { staffChords, tieEnds } from "./support/common.ts";

export const slurTieEndpoint = defineRule({
  id: "slur-tie-endpoint",
  meta: {
    name: "タイの途中のスラー端点",
    description: "タイで続く音から始まる・タイの途中で終わるスラーを検出",
    category: "slur-tie",
    severity: "info",
    tier: "nursery",
    docs: "スラーがタイで続く音から始まる、またはタイの途中で終わる",
  },
  options: {},
  messages: {
    startsOnContinuation: "スラーがタイで続く音から始まっています。タイの最初の音から始めます",
    endsInsideTie: "スラーがタイの途中で終わっています。タイの最後の音まで掛けます",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [
            { tick: 0, notes: [{ pitch: 60, tpc: 14, line: 0, accidentalShown: false }] },
            { tick: 480, notes: [{ pitch: 60, tpc: 14, line: 0, accidentalShown: false }] },
            { tick: 960, notes: [{ pitch: 62, tpc: 16, line: 0, accidentalShown: false }] },
          ],
          ties: [{ startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
          slurs: [{ startTick: 480, endTick: 960 }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [
            { tick: 0, notes: [{ pitch: 60, tpc: 14, line: 0, accidentalShown: false }] },
            { tick: 480, notes: [{ pitch: 60, tpc: 14, line: 0, accidentalShown: false }] },
            { tick: 960, notes: [{ pitch: 62, tpc: 16, line: 0, accidentalShown: false }] },
          ],
          ties: [{ startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
          slurs: [{ startTick: 0, endTick: 960 }],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      if (tiesOn(score, staff).length === 0) continue;
      const chords = staffChords(score, staff);
      const ties = tieEnds(score, staff);
      for (const slur of slursOn(score, staff)) {
        // 単一音のスラーは slur-single-note が受け持つ
        if (slur.startTick === slur.endTick) continue;
        const first = chords.at(slur.voice, slur.startTick);
        const last = chords.at(slur.voice, slur.endTick);
        const at = (tick: number) => ({
          staff,
          measure: measureAt(score, tick)?.serial ?? 0,
          tick,
        });
        const detail = { startTick: slur.startTick, endTick: slur.endTick };
        // 和音の一部だけがタイで続くなら、残りの音はそこで新しく弾かれる
        if (first && ties.allContinued(slur.voice, first)) {
          report({
            at: at(slur.startTick),
            messageId: "startsOnContinuation",
            detail: { ...detail, endpoint: "start" },
          });
        }
        if (last && ties.allContinuing(slur.voice, last)) {
          report({
            at: at(slur.endTick),
            messageId: "endsInsideTie",
            detail: { ...detail, endpoint: "end" },
          });
        }
      }
    }
  },
});
