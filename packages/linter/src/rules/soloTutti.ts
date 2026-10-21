import { techniquePair } from "./support/techniquePairs.ts";

// tutti を挟まない二連ソロは実際の記譜でも起こりうる
export const soloTutti = techniquePair({
  id: "solo-tutti",
  name: "Solo / Tutti",
  description: "solo/tutti の対応漏れ・重複を検出",
  docs: "`solo`/`soli` → `tutti` の対応漏れ・重複（`tutti` を挟まない二連ソロは info）",
  on: ["solo"],
  off: ["tutti"],
  onDuplicateSeverity: "info",
  messages: {
    onDuplicate:
      "solo が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    offDuplicate:
      "tutti が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    unclosed: "solo のまま曲が終了しています（tutti が必要かもしれません）",
  },
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "solo" }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "solo" },
            { staff: 0, measure: 3, tick: 960, text: "tutti" },
          ],
        },
      },
    ],
  },
});
