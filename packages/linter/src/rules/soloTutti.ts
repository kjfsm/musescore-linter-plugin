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
  onLabel: "solo",
  offLabel: "tutti",
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
