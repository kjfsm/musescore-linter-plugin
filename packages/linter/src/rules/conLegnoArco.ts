import { techniquePair } from "./support/techniquePairs.ts";

export const conLegnoArco = techniquePair({
  id: "con-legno-arco",
  name: "Con legno / Arco",
  description: "con legno→arco の対応漏れ・重複を検出",
  docs: "`con legno`（弓の木部奏法）→ `arco` 復帰の対応漏れ・重複",
  on: ["col-legno"],
  off: ["arco", "ord"],
  messages: {
    onDuplicate:
      "con legno が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    offDuplicate:
      "arco が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
    unclosed: "con legno のまま曲が終了しています（arco が必要かもしれません）",
  },
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
