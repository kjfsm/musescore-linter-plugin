import { techniquePair } from "./support/techniquePairs.ts";

export const sordino = techniquePair({
  id: "sordino",
  name: "Con sord. / Senza sord.",
  description: "con sord.→senza sord. の対応漏れ・重複を検出",
  docs: "弱音器の対応漏れ・重複",
  on: ["con-sord"],
  off: ["senza-sord"],
  messages: {
    onDuplicate:
      "con sord. が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    offDuplicate:
      "senza sord. が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    unclosed: "con sord. のまま曲が終了しています（senza sord. が必要かもしれません）",
  },
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "con sord." }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "con sord." },
            { staff: 0, measure: 3, tick: 960, text: "senza sord." },
          ],
        },
      },
    ],
  },
});
