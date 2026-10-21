import { defineRule } from "../engine.ts";
import { ofKind, staffOfScope } from "./support/common.ts";
import { bpmOf } from "./support/tempo.ts";

export const tempoWithoutBpm = defineRule({
  id: "tempo-without-bpm",
  meta: {
    name: "BPM 値なしテンポ",
    description: "BPM値のないテンポ表記を検出",
    category: "tempo",
    severity: "warning",
    tier: "pedantic",
    docs: "テンポ表記に BPM 値が未設定（再生テンポに反映されない）",
  },
  options: {},
  messages: {
    missing: 'テンポ表記 "{text}" に BPM 値が設定されていません',
  },
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, tick: 0, text: "Allegro", kind: "tempo" }] } }],
    valid: [
      {
        score: { annotations: [{ staff: 0, tick: 0, text: "Allegro", kind: "tempo", bpm: 120 }] },
      },
    ],
  },
  run({ score, report }) {
    for (const a of ofKind(score.annotations, "tempo")) {
      if (bpmOf(a) !== null) continue;
      const staff = staffOfScope(score, a.scope);
      report({
        at: { ...(staff !== undefined ? { staff } : {}), measure: a.measure, tick: a.tick },
        messageId: "missing",
        data: { text: a.text || "(無題)" },
      });
    }
  },
});
