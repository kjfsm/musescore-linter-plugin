import { voiceEventsIn } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";

export const fermataConsistency = defineRule({
  id: "fermata-consistency",
  meta: {
    name: "フェルマータの食い違い",
    description: "他のパートにあるフェルマータが無い譜表を検出",
    category: "notation",
    severity: "warning",
    tier: "nursery",
    docs: "他のパートでフェルマータのある小節に、フェルマータが無いパート",
  },
  options: {},
  messages: {
    missing: "他のパートにあるフェルマータがこのパートにありません",
  },
  examples: {
    invalid: [
      {
        score: {
          parts: [{}, {}],
          chords: [
            { staff: 0, tick: 480, fermata: true },
            { staff: 1, tick: 480 },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          parts: [{}, {}],
          chords: [
            { staff: 0, tick: 480, fermata: true },
            { staff: 1, tick: 480, fermata: true },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    const withFermata = new Map<number, { staves: Set<number>; tick: number }>();
    for (const staff of score.staves) {
      for (const voice of staff.voices) {
        for (const e of voice.events) {
          if (!e.fermata) continue;
          const entry = withFermata.get(e.measure);
          if (!entry) withFermata.set(e.measure, { staves: new Set([staff.index]), tick: e.tick });
          else {
            entry.staves.add(staff.index);
            entry.tick = Math.min(entry.tick, e.tick);
          }
        }
      }
    }
    // 位置は比べない。全休符の上のフェルマータは小節の頭に付き、旋律の音符のフェルマータと位置がずれる。
    // 譜表ではなくパートで比べる。ピアノは片手の譜表にだけフェルマータを書くことがある
    for (const [measure, { staves, tick }] of [...withFermata].sort((a, b) => a[0] - b[0])) {
      for (const part of score.parts) {
        if (part.staves.some((s) => staves.has(s))) continue;
        const played = part.staves.find((s) =>
          score.staves[s]?.voices.some((_, v) => voiceEventsIn(score, s, v, measure).length > 0),
        );
        if (played === undefined) continue;
        report({
          at: { staff: played, measure, tick },
          messageId: "missing",
          detail: { stavesWithFermata: [...staves].sort((a, b) => a - b) },
        });
      }
    }
  },
});
