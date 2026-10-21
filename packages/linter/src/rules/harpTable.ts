import { techniquePair } from "./support/techniquePairs.ts";

export const harpTable = techniquePair({
  id: "harp-table",
  name: "Près de la table / Ord.",
  description: "près de la table→ordinario 復帰の対応漏れ・重複を検出",
  docs: "ハープ `près de la table`（響板寄り奏法）→ `ordinario` 復帰の対応漏れ・重複",
  on: ["pres-de-la-table"],
  off: ["ord", "natural"],
  onLabel: "près de la table",
  offLabel: "ordinario",
  examples: {
    invalid: [
      { score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "près de la table" }] } },
    ],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "près de la table" },
            { staff: 0, measure: 3, tick: 960, text: "ord." },
          ],
        },
      },
    ],
  },
});
