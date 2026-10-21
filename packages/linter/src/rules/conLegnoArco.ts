import { techniquePair } from "./support/techniquePairs.ts";

export const conLegnoArco = techniquePair({
  id: "con-legno-arco",
  name: "Con legno / Arco",
  description: "con legno→arco の対応漏れ・重複を検出",
  docs: "`con legno`（弓の木部奏法）→ `arco` 復帰の対応漏れ・重複",
  on: ["col-legno"],
  off: ["arco", "ord"],
  onLabel: "con legno",
  offLabel: "arco",
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "con legno" }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "con legno" },
            { staff: 0, measure: 3, tick: 960, text: "arco" },
          ],
        },
      },
    ],
  },
});
