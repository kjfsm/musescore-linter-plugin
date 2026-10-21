import { annotationsAffecting, firstEventTick } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { ofKind } from "./support/common.ts";
import { TOP_STAFF } from "./support/tempo.ts";

export const openingTempo = defineRule({
  id: "opening-tempo",
  meta: {
    name: "冒頭テンポ表記",
    description: "曲頭のテンポ表記の欠落を検出",
    category: "tempo",
    severity: "error",
    tier: "recommended",
    docs: "曲頭にテンポ表記があるか",
  },
  options: {},
  messages: {
    missing: "冒頭にテンポ表記がありません",
  },
  examples: {
    invalid: [{ score: { chords: [{ tick: 0 }] } }],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }],
          annotations: [{ tick: 0, text: "Allegro", kind: "tempo", bpm: 120 }],
        },
      },
    ],
  },
  run({ score, report }) {
    const first = firstEventTick(score, TOP_STAFF);
    if (first === null) return;
    const tempos = ofKind(annotationsAffecting(score, TOP_STAFF), "tempo");
    if (tempos.some((a) => a.tick <= first)) return;
    report({ at: { staff: TOP_STAFF, measure: 1, tick: first }, messageId: "missing" });
  },
});
