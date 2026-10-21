import { defineRule } from "../engine.ts";

const TOP_STAFF = 0;

export const repeatBarlineMatch = defineRule({
  id: "repeat-barline-match",
  meta: {
    name: "リピート小節線の対応",
    description: "リピート開始に対応する終了が無い箇所を検出",
    category: "notation",
    severity: "warning",
    tier: "recommended",
    docs: "リピート開始(‖:)に対応する終了(:‖)が無い（終了のみは曲頭反復として許容）",
  },
  options: {},
  messages: {
    unclosed: "リピート開始に対応する終了リピートがありません",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }],
          barlines: [{ tick: 0, measure: 1, kind: "repeat-start" }],
        },
      },
    ],
    valid: [
      {
        score: {
          barlines: [
            { tick: 0, measure: 1, kind: "repeat-start" },
            { tick: 1920, measure: 2, kind: "repeat-end" },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    // 終了リピートだけなら曲頭からの反復として正しい。開いたまま閉じない開始だけを報告する。
    let open: { measure: number; tick: number } | null = null;
    const unclosed = (at: { measure: number; tick: number }) =>
      report({
        at: { staff: TOP_STAFF, ...at },
        messageId: "unclosed",
      });
    for (const bar of score.staves[TOP_STAFF]?.barlines ?? []) {
      if (bar.kind === "repeat-start") {
        if (open) unclosed(open);
        open = { measure: bar.measure, tick: bar.tick };
      } else if (bar.kind === "repeat-end") {
        open = null;
      } else if (bar.kind === "repeat-both") {
        open = { measure: bar.measure, tick: bar.tick };
      }
    }
    if (open) unclosed(open);
  },
});
