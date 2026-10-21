import type { Chord } from "@score-linter/score-model";
import { stableSortBy, tpcToAlter, tpcToName } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";

function alterName(alter: number): string {
  switch (alter) {
    case 0:
      return "ナチュラル";
    case 1:
      return "シャープ";
    case -1:
      return "フラット";
    case 2:
      return "ダブルシャープ";
    case -2:
      return "ダブルフラット";
    default:
      return "臨時記号";
  }
}

export const courtesyAccidental = defineRule({
  id: "courtesy-accidental",
  meta: {
    name: "親切臨時記号の提案",
    description: "親切臨時記号を付けた方がよい箇所を提案",
    category: "notation",
    severity: "info",
    tier: "pedantic",
    docs: "前小節で臨時記号が付いた音が次小節で記号なしで再び現れる箇所に親切記号を提案",
  },
  options: {},
  messages: {
    suggest:
      "{note} に親切のための{alter}を補うとよいかもしれません（前の小節で{previousAlter}が付いていた音）",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [
            {
              tick: 0,
              measure: 1,
              notes: [{ pitch: 66, tpc: 20, line: 5, accidentalShown: true }],
            },
            {
              tick: 1920,
              measure: 2,
              notes: [{ pitch: 65, tpc: 13, line: 5, accidentalShown: false }],
            },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [
            {
              tick: 0,
              measure: 1,
              notes: [{ pitch: 66, tpc: 20, line: 5, accidentalShown: true }],
            },
            {
              tick: 1920,
              measure: 2,
              notes: [{ pitch: 66, tpc: 20, line: 5, accidentalShown: true }],
            },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    // 前の小節で臨時記号が付いた音が、小節線で打ち消されたあと記号なしで再び現れるなら、
    // 出版譜の慣習では念のための臨時記号を補う。
    for (const staff of score.staves) {
      const placed: { chord: Chord; voice: number }[] = [];
      staff.voices.forEach((v, voice) => {
        for (const e of v.events) if (e.type === "chord") placed.push({ chord: e, voice });
      });
      const chords = stableSortBy(
        placed,
        (a, b) =>
          a.chord.measure - b.chord.measure || a.chord.tick - b.chord.tick || a.voice - b.voice,
      );
      const lastExplicit = new Map<number, { measure: number; alter: number }>();
      const suggested = new Set<string>();

      for (const { chord } of chords) {
        for (const note of chord.notes) {
          const alter = tpcToAlter(note.tpc);
          if (note.accidentalShown) {
            lastExplicit.set(note.line, { measure: chord.measure, alter });
            continue;
          }
          const prev = lastExplicit.get(note.line);
          if (!prev || prev.measure !== chord.measure - 1 || prev.alter === alter) continue;
          const key = `${note.line}:${chord.measure}`;
          if (suggested.has(key)) continue;
          suggested.add(key);
          report({
            at: { staff: staff.index, measure: chord.measure, tick: chord.tick },
            messageId: "suggest",
            data: {
              note: tpcToName(note.tpc),
              alter: alterName(alter),
              previousAlter: alterName(prev.alter),
            },
            detail: {
              line: note.line,
              previousMeasure: prev.measure,
              previousAlter: prev.alter,
              currentAlter: alter,
            },
          });
        }
      }
    }
  },
});
