import type { Chord } from "@score-linter/score-model";
import {
  annotationsOn,
  hairpinsOn,
  measureAt,
  tiesOn,
  voiceEventsIn,
} from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { DURATION_NAMES, beatCrossing, metersBySerial, noteValueTicks } from "./support/meter.ts";

const note = { pitch: 60, tpc: 14, line: 0, accidentalShown: false };

export const mergeableTie = defineRule({
  id: "mergeable-tie",
  meta: {
    name: "まとめられるタイ",
    description: "1 つの音符で書けるタイを検出",
    category: "slur-tie",
    severity: "info",
    tier: "nursery",
    docs: "1 つの音符で書けるタイ（まとめても拍をまたがず、後ろの音に記号が無いときだけ）",
  },
  options: {},
  messages: {
    mergeable: "{first}と{second}のタイは 1 つの{merged}で書けます",
  },
  examples: {
    invalid: [
      {
        score: {
          measures: [{ timeSignature: [4, 4] }],
          chords: [
            { tick: 0, duration: { numerator: 1, denominator: 8 }, notes: [note] },
            { tick: 240, duration: { numerator: 1, denominator: 8 }, notes: [note] },
            { tick: 480, duration: { numerator: 3, denominator: 4 }, notes: [note] },
          ],
          ties: [{ startTick: 0, endTick: 240, startPitch: 60, endPitch: 60 }],
        },
      },
    ],
    valid: [
      {
        score: {
          measures: [{ timeSignature: [4, 4] }],
          chords: [
            { tick: 0, duration: { numerator: 1, denominator: 4 }, notes: [note] },
            { tick: 480, duration: { numerator: 1, denominator: 4 }, notes: [note] },
            { tick: 960, duration: { numerator: 1, denominator: 2 }, notes: [note] },
          ],
          ties: [{ startTick: 480, endTick: 960, startPitch: 60, endPitch: 60 }],
        },
      },
    ],
  },
  run({ score, report }) {
    const meters = metersBySerial(score);
    for (const { index: staff } of score.staves) {
      const ties = tiesOn(score, staff);
      // 後ろの音に注記やヘアピンの端があれば、タイで分けている理由があるとみなす
      const markedTicks = new Set(annotationsOn(score, staff).map((a) => a.tick));
      for (const h of hairpinsOn(score, staff)) markedTicks.add(h.startTick).add(h.endTick);
      const seen = new Set<string>();
      for (const tie of ties) {
        const key = `${tie.voice}:${tie.startTick}:${tie.endTick}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const measure = measureAt(score, tie.startTick);
        const meter = measure ? meters[measure.serial] : null;
        if (!measure || !meter || markedTicks.has(tie.endTick)) continue;
        const events = voiceEventsIn(score, staff, tie.voice, measure.serial);
        const at = (tick: number) =>
          events.find((e): e is Chord => e.type === "chord" && e.tick === tick);
        const first = at(tie.startTick);
        const second = at(tie.endTick);
        if (!first || !second || second.articulations.length > 0) continue;

        const firstTicks = noteValueTicks(first.duration, first.tuplet);
        const secondTicks = noteValueTicks(second.duration, second.tuplet);
        if (firstTicks === null || secondTicks === null) continue;
        if (first.tick + firstTicks !== second.tick) continue;
        const tiedNotes = ties.filter(
          (t) => t.voice === tie.voice && t.startTick === first.tick && t.endTick === second.tick,
        ).length;
        if (tiedNotes < first.notes.length || first.notes.length !== second.notes.length) continue;

        const mergedTicks = firstTicks + secondTicks;
        const mergedName = DURATION_NAMES[mergedTicks];
        const onset = first.tick - meter.startTick;
        if (!mergedName || beatCrossing(onset, mergedTicks, meter)) continue;
        report({
          at: { staff, measure: first.measure, tick: first.tick },
          messageId: "mergeable",
          data: {
            first: String(DURATION_NAMES[firstTicks]),
            second: String(DURATION_NAMES[secondTicks]),
            merged: mergedName,
          },
          detail: { firstTicks, secondTicks, mergedTicks, timeSig: meter.timeSig },
        });
      }
    }
  },
});
