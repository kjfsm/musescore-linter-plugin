import { keyAt, tpcToName } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { chordsInOrder, keyLabel } from "./support/spelling.ts";

/**
 * 調号から五度圏でこれより離れた綴りは、異名同音で書いたほうが読みやすい。5 にすると、
 * ホ長調の B#（導音）は範囲に入り、ハ長調の B#・Cb は外れる。
 */
const SPELLING_REACH = 5;

export const extremeSpelling = defineRule({
  id: "extreme-spelling",
  meta: {
    name: "調から遠い綴り",
    description: "調号から遠い綴り（ハ長調の B#・Cb・重嬰・重変など）を検出",
    category: "notation",
    severity: "info",
    tier: "nursery",
    docs: "調号から遠い綴り（ハ長調の B♯・C♭・重嬰・重変など）。異名同音で書くと読みやすい",
  },
  options: {},
  messages: {
    far: "{name} は調号（{key}）から遠い綴りです。異名同音で書くと読みやすくなります",
  },
  examples: {
    invalid: [
      {
        score: {
          keySignatures: [{ tick: 0, fifths: 0 }],
          chords: [{ tick: 0, notes: [{ pitch: 59, tpc: 7, line: 0, accidentalShown: true }] }],
        },
      },
    ],
    valid: [
      {
        score: {
          keySignatures: [{ tick: 0, fifths: 4 }],
          chords: [{ tick: 0, notes: [{ pitch: 60, tpc: 26, line: 0, accidentalShown: true }] }],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const seen = new Set<string>();
      for (const { chord } of chordsInOrder(score, [staff])) {
        const key = keyAt(score, staff, chord.tick);
        if (key === null) continue;
        // 調の幹音は tpc で 13+key（F の位置）から 19+key（B の位置）に並ぶ
        const low = 13 + key - SPELLING_REACH;
        const high = 19 + key + SPELLING_REACH;
        for (const note of chord.notes) {
          if (note.tpc >= low && note.tpc <= high) continue;
          const dedupe = `${chord.measure}:${note.tpc}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);
          report({
            at: { staff, measure: chord.measure, tick: chord.tick },
            messageId: "far",
            data: { name: tpcToName(note.tpc), key: keyLabel(key) },
            detail: { tpc: note.tpc, fifths: key },
          });
        }
      }
    }
  },
});
