import { defineRule } from "../engine.ts";
import { keyLabel } from "./support/spelling.ts";

export const keySignature = defineRule({
  id: "key-signature",
  meta: {
    name: "調号の書き方",
    description: "7 つの調号と、前と同じ調号への変更を検出",
    category: "notation",
    severity: "info",
    tier: "pedantic",
    docs: "7 つの調号、前と同じ調号への変更",
  },
  options: {},
  messages: {
    sevenAccidentals: "調号が{key}です。異名同音の調（{enharmonicKey}）で書くと読みやすくなります",
    unchanged: "前と同じ調号に変更しています",
  },
  examples: {
    invalid: [
      { score: { keySignatures: [{ tick: 0, fifths: -7 }] } },
      {
        score: {
          measures: [{}, {}],
          keySignatures: [
            { tick: 0, fifths: 2 },
            { tick: 1920, fifths: 2 },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          measures: [{}, {}],
          keySignatures: [
            { tick: 0, fifths: 6 },
            { tick: 1920, fifths: -6 },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    for (const { index: staff, keySignatures } of score.staves) {
      let previous: number | null = null;
      for (const key of keySignatures) {
        const at = { staff, measure: key.measure, tick: key.tick };
        if (Math.abs(key.fifths) >= 7) {
          report({
            at,
            messageId: "sevenAccidentals",
            data: {
              key: keyLabel(key.fifths),
              enharmonicKey: keyLabel(key.fifths > 0 ? key.fifths - 12 : key.fifths + 12),
            },
            detail: { fifths: key.fifths },
          });
        }
        if (previous === key.fifths) {
          report({
            at,
            messageId: "unchanged",
            detail: { fifths: key.fifths },
          });
        }
        previous = key.fifths;
      }
    }
  },
});
