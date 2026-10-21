import { defineRule } from "../engine.ts";
import { dynamicsAffecting, dynamicsOn, isDynamicChange } from "./support/dynamics.ts";

export const crescTextResolution = defineRule({
  id: "cresc-text-resolution",
  meta: {
    name: "cresc./dim. の到達先",
    description: "テキスト式cresc./dim.の到達先ダイナミクス欠落を検出",
    category: "dynamics",
    severity: "info",
    tier: "recommended",
    docs: "テキスト式 cresc./dim. の後に到達先の強弱記号が現れない",
  },
  options: {},
  messages: {
    missing: '"{text}" の後に到達先の強弱記号がありません',
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }],
          annotations: [{ staff: 0, tick: 0, measure: 1, text: "cresc.", kind: "dynamic" }],
        },
      },
    ],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, tick: 0, measure: 1, text: "cresc.", kind: "dynamic" },
            { staff: 0, tick: 480, measure: 1, text: "f", kind: "dynamic" },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const targets = dynamicsAffecting(score, staff)
        .filter((a) => !isDynamicChange(a))
        .map((a) => a.tick);
      for (const a of dynamicsOn(score, staff)) {
        if (!isDynamicChange(a)) continue;
        if (targets.some((t) => t > a.tick)) continue;
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          messageId: "missing",
          data: { text: a.text },
        });
      }
    }
  },
});
