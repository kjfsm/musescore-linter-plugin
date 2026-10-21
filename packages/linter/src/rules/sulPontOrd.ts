import { techniquePair } from "./support/techniquePairs.ts";

export const sulPontOrd = techniquePair({
  id: "sul-pont-ord",
  name: "Sul pont. / Ord.",
  description: "sul pont.→ord. の対応漏れ・重複を検出",
  docs: "`sul pont.`（駒寄り奏法）→ `ord.` 復帰の対応漏れ・重複",
  on: ["sul-pont"],
  off: ["ord", "arco"],
  messages: {
    onDuplicate:
      "sul pont. が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    offDuplicate:
      "ord. が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    unclosed: "sul pont. のまま曲が終了しています（ord. が必要かもしれません）",
  },
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "sul pont." }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "sul pont." },
            { staff: 0, measure: 3, tick: 960, text: "ord." },
          ],
        },
      },
    ],
  },
});
