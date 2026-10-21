import type { Chord } from "@score-linter/score-model";
import { slursOn } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { staffChords, tieEnds } from "./support/common.ts";

const pitchesOf = (chord: Chord): string =>
  chord.notes
    .map((n) => n.pitch)
    .sort((a, b) => (a ?? 0) - (b ?? 0))
    .join(",");

export const slurSamePitch = defineRule({
  id: "slur-same-pitch",
  meta: {
    name: "同音のスラー",
    description: "同じ音高の 2 音だけを結ぶスラー（タイの書き間違い）を検出",
    category: "slur-tie",
    severity: "warning",
    tier: "recommended",
    docs: "同じ音高の 2 音だけをスラーで結んでいる（タイの書き間違いの可能性。アーティキュレーションがあればポルタートとして許容）",
  },
  options: {},
  messages: {
    samePitch: "同じ音高の 2 音をスラーで結んでいます。タイの書き間違いの可能性があります",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [
            { tick: 0, notes: [{ pitch: 60, tpc: 14, line: 0, accidentalShown: false }] },
            { tick: 480, notes: [{ pitch: 60, tpc: 14, line: 0, accidentalShown: false }] },
          ],
          slurs: [{ startTick: 0, endTick: 480 }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [
            { tick: 0, notes: [{ pitch: 60, tpc: 14, line: 0, accidentalShown: false }] },
            { tick: 480, notes: [{ pitch: 62, tpc: 16, line: 0, accidentalShown: false }] },
          ],
          slurs: [{ startTick: 0, endTick: 480 }],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const slurs = slursOn(score, staff);
      if (slurs.length === 0) continue;
      const chords = staffChords(score, staff);
      const ties = tieEnds(score, staff);
      for (const slur of slurs) {
        const first = chords.at(slur.voice, slur.startTick);
        const second = first && chords.next(first);
        if (!first || !second || second.tick !== slur.endTick) continue;
        if (first.notes.some((n) => n.pitch === null) || first.notes.length === 0) continue;
        if (pitchesOf(first) !== pitchesOf(second)) continue;
        // スラーの下のスタッカートやテヌートは同音反復の正しい書き方（ポルタート）
        if (first.articulations.length > 0 || second.articulations.length > 0) continue;
        if (ties.allContinuing(slur.voice, first)) continue;
        report({
          at: { staff, measure: first.measure, tick: first.tick },
          messageId: "samePitch",
          detail: { startTick: slur.startTick, endTick: slur.endTick },
        });
      }
    }
  },
});
