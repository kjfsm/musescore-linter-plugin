import { techniquePair } from "./support/techniquePairs.ts";

export const unaCorda = techniquePair({
  id: "una-corda",
  name: "Una corda / Tre corde",
  description: "una corda→tre corde 復帰の対応漏れ・重複を検出",
  docs: "ピアノ左ペダル `una corda` → `tre corde` の対応漏れ・重複",
  on: ["una-corda"],
  off: ["tre-corde"],
  onLabel: "una corda",
  offLabel: "tre corde",
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "una corda" }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "una corda" },
            { staff: 0, measure: 3, tick: 960, text: "tre corde" },
          ],
        },
      },
    ],
  },
});
