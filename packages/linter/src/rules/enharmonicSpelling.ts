import type { Chord } from "@score-linter/score-model";
import { tpcToName } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { chordsInOrder } from "./support/spelling.ts";

const fSharp = { pitch: 66, tpc: 20, line: 5, accidentalShown: true };
const gFlat = { pitch: 66, tpc: 8, line: 4, accidentalShown: true };

export const enharmonicSpelling = defineRule({
  id: "enharmonic-spelling",
  meta: {
    name: "異名同音の不統一",
    description: "同じ音高を同時に・続けて違う綴りで書いている箇所を検出",
    category: "notation",
    severity: "info",
    tier: "nursery",
    docs: "同じパートの同じ位置、または同じ声部の同じ小節で続く同じ音高を違う綴りで書いている",
  },
  options: {},
  messages: {
    simultaneous: "同じ音高を同時に違う綴りで書いています（{spellings}）",
    consecutive: "直前と同じ音高を違う綴りで書いています（{spellings}）",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [
            { voice: 0, tick: 0, notes: [fSharp] },
            { voice: 1, tick: 0, notes: [gFlat] },
          ],
        },
      },
      {
        score: {
          chords: [
            { tick: 0, notes: [fSharp] },
            { tick: 480, notes: [gFlat] },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          parts: [{}, {}],
          chords: [
            { staff: 0, tick: 0, notes: [fSharp] },
            { staff: 1, tick: 0, notes: [gFlat] },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    // 移調楽器の記譜が実音と混ざらないよう、比べるのは同じパートの中だけ
    for (const part of score.parts) {
      const placed = chordsInOrder(score, part.staves);

      const atTick = new Map<
        string,
        { staff: number; tick: number; measure: number; tpcs: Set<number> }
      >();
      for (const { chord, staff } of placed) {
        for (const note of chord.notes) {
          if (note.pitch === null) continue;
          const key = `${chord.tick}:${note.pitch}`;
          const entry = atTick.get(key);
          if (entry) entry.tpcs.add(note.tpc);
          else
            atTick.set(key, {
              staff,
              tick: chord.tick,
              measure: chord.measure,
              tpcs: new Set([note.tpc]),
            });
        }
      }
      for (const { staff, tick, measure, tpcs } of atTick.values()) {
        if (tpcs.size < 2) continue;
        const spellings = [...tpcs].sort((a, b) => b - a).map(tpcToName);
        report({
          at: { staff, measure, tick },
          messageId: "simultaneous",
          data: { spellings: spellings.join(" / ") },
          detail: { spellings },
        });
      }

      const lastInVoice = new Map<string, Chord>();
      for (const { chord, staff, voice } of placed) {
        const key = `${staff}:${voice}`;
        const prev = lastInVoice.get(key);
        lastInVoice.set(key, chord);
        // 小節をまたいだ綴りの変更は、転調の書き方として許す
        if (!prev || prev.measure !== chord.measure) continue;
        for (const note of chord.notes) {
          const before = prev.notes.find((n) => n.pitch !== null && n.pitch === note.pitch);
          if (!before || before.tpc === note.tpc) continue;
          const spellings = [tpcToName(before.tpc), tpcToName(note.tpc)];
          report({
            at: { staff, measure: chord.measure, tick: chord.tick },
            messageId: "consecutive",
            data: { spellings: spellings.join(" → ") },
            detail: { spellings },
          });
        }
      }
    }
  },
});
