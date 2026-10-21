import { defineRule } from "../engine.ts";
import { directiveOf, ofKind, staffOfScope } from "./support/common.ts";

export const dynamicAsText = defineRule({
  id: "dynamic-as-text",
  meta: {
    name: "テキストで書いた強弱記号",
    description: "強弱記号ではなく普通のテキストで書いた強弱記号を検出",
    category: "dynamics",
    severity: "warning",
    tier: "recommended",
    docs: "「f」「mp」などを強弱記号ではなく普通のテキストで書いている（再生に反映されない）",
  },
  options: {},
  messages: {
    asText:
      '"{text}" が普通のテキストで書かれています。強弱記号として入れないと再生に反映されません',
  },
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, tick: 480, text: "mf" }] } }],
    valid: [{ score: { annotations: [{ staff: 0, tick: 480, text: "più f" }] } }],
  },
  run({ score, report }) {
    for (const a of ofKind(score.annotations, "text")) {
      if (!directiveOf(a, "dynamic")) continue;
      const staff = staffOfScope(score, a.scope);
      report({
        at: { ...(staff !== undefined ? { staff } : {}), measure: a.measure, tick: a.tick },
        messageId: "asText",
        data: { text: a.text },
      });
    }
  },
});
