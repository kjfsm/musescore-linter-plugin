import { annotationsAffecting, stableSortBy } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { ofKind } from "./support/common.ts";
import { bpmOf, TOP_STAFF } from "./support/tempo.ts";

export const tempoBarline = defineRule({
  id: "tempo-barline",
  meta: {
    name: "テンポ変更と複縦線",
    description: "テンポ変更前に複縦線が無い箇所を検出",
    category: "tempo",
    severity: "info",
    tier: "pedantic",
    docs: "テンポ変更前の小節に複縦線があるか",
  },
  options: {},
  messages: {
    missing: "テンポ変更（{text}）の前の小節に複縦線がありません",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }, { tick: 480, measure: 2 }, { tick: 960, measure: 3 }],
          annotations: [
            { staff: 0, tick: 0, text: "Allegro", kind: "tempo", bpm: 120 },
            { staff: 0, measure: 3, tick: 960, text: "Presto", kind: "tempo", bpm: 180 },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }, { tick: 480, measure: 2 }, { tick: 960, measure: 3 }],
          barlines: [{ tick: 958, measure: 2, kind: "double" }],
          annotations: [
            { staff: 0, tick: 0, text: "Allegro", kind: "tempo", bpm: 120 },
            { staff: 0, measure: 3, tick: 960, text: "Presto", kind: "tempo", bpm: 180 },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    const staff = score.staves[TOP_STAFF];
    if (!staff) return;

    const barlines = staff.barlines;
    const kindByMeasure = new Map<number, string>();
    for (const bar of barlines) kindByMeasure.set(bar.measure, bar.kind);

    const seen = new Set<number>();
    const tempos = stableSortBy(
      ofKind(annotationsAffecting(score, TOP_STAFF), "tempo"),
      (a, b) => a.tick - b.tick || a.measure - b.measure,
    ).filter((a) => {
      if (seen.has(a.tick)) return false;
      seen.add(a.tick);
      return true;
    });

    const firstTick = tempos[0]?.tick ?? null;
    let previousBpm: number | null = null;
    let cursor = -1;
    for (const tempo of tempos) {
      const bpm = bpmOf(tempo);
      if (tempo.tick === firstTick) {
        previousBpm = bpm;
        continue;
      }
      if (previousBpm !== null && bpm !== null && bpm === previousBpm) continue;
      previousBpm = bpm;

      while (cursor + 1 < barlines.length && barlines[cursor + 1]!.tick < tempo.tick) cursor++;
      const barBefore = cursor >= 0 ? barlines[cursor]! : null;
      const previousMeasure = tempo.measure - 1;
      if (kindByMeasure.get(previousMeasure) === "double" || barBefore?.kind === "double") continue;

      report({
        at: { staff: TOP_STAFF, measure: previousMeasure, tick: tempo.tick },
        messageId: "missing",
        data: { text: tempo.text },
      });
    }
  },
});
