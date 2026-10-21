import { tpcToAlter, tpcToName } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { chordsInOrder } from "./support/spelling.ts";

const fSharp = { pitch: 66, tpc: 20, line: 5, accidentalShown: true };

export const redundantAccidental = defineRule({
  id: "redundant-accidental",
  meta: {
    name: "不要な臨時記号",
    description: "同じ小節で既に有効な臨時記号をもう一度付けている箇所を検出",
    category: "notation",
    severity: "info",
    tier: "pedantic",
    docs: "同じ小節で既に有効な臨時記号をもう一度付けている（調号による不要は見ない）",
  },
  options: {},
  messages: {
    redundant: "{name} の臨時記号は同じ小節で既に有効です",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [
            { tick: 0, notes: [fSharp] },
            { tick: 480, notes: [fSharp] },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          measures: [{}, {}],
          chords: [
            { tick: 0, notes: [fSharp] },
            { tick: 1920, notes: [fSharp] },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      let measure = -1;
      const inEffect = new Map<number, { alter: number; tick: number }>();
      for (const { chord } of chordsInOrder(score, [staff])) {
        if (chord.measure !== measure) {
          measure = chord.measure;
          inEffect.clear();
        }
        for (const note of chord.notes) {
          const alter = tpcToAlter(note.tpc);
          // 記号の無い音（調号やタイで効いている変化）のあとの臨時記号は、MuseScore が自動では
          // 出さないので、人が付けた親切記号である。表示された臨時記号どうしだけを比べる
          if (!note.accidentalShown) continue;
          const current = inEffect.get(note.line);
          // 同じ位置の別の声部には、それぞれに臨時記号を書くのが慣習
          if (current?.alter === alter && current.tick < chord.tick) {
            report({
              at: { staff, measure: chord.measure, tick: chord.tick },
              messageId: "redundant",
              data: { name: tpcToName(note.tpc) },
              detail: { line: note.line, alter, previousTick: current.tick },
            });
          }
          inEffect.set(note.line, { alter, tick: chord.tick });
        }
      }
    }
  },
});
