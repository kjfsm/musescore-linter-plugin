import { techniquePair } from "./support/techniquePairs.ts";

export const sulTastoOrd = techniquePair({
  id: "sul-tasto-ord",
  name: "Sul tasto / Ord.",
  description: "sul tasto→ord. の対応漏れ・重複を検出",
  docs: "`sul tasto`（駒から離れた奏法）→ `ord.` 復帰の対応漏れ・重複",
  on: ["sul-tasto"],
  off: ["ord", "arco"],
  messages: {
    onDuplicate:
      "sul tasto が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    offDuplicate:
      "ord. が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    unclosed: "sul tasto のまま曲が終了しています（ord. が必要かもしれません）",
  },
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "sul tasto" }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "sul tasto" },
            { staff: 0, measure: 3, tick: 960, text: "ord." },
          ],
        },
      },
    ],
  },
});
