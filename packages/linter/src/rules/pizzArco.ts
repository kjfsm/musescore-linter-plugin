import { techniquePair } from "./support/techniquePairs.ts";

export const pizzArco = techniquePair({
  id: "pizz-arco",
  name: "Pizz / Arco",
  description: "pizz.→arco の順序の乱れ・対応漏れを検出",
  docs: "`pizz.` 開始 → `arco` 解除の対応漏れ・重複",
  on: ["pizz"],
  off: ["arco"],
  messages: {
    onDuplicate:
      "pizz. が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    offDuplicate:
      "arco が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    unclosed: "pizz. のまま曲が終了しています（arco が必要かもしれません）",
  },
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "pizz." }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "pizz." },
            { staff: 0, measure: 3, tick: 960, text: "arco" },
          ],
        },
      },
    ],
  },
});
