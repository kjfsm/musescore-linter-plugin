import { techniquePair } from "./support/techniquePairs.ts";

export const divUnis = techniquePair({
  id: "div-unis",
  name: "Div. / Unis.",
  description: "div.→unis. の対応漏れ・重複を検出",
  docs: "`div.` → `unis.` の対応漏れ・重複",
  on: ["div"],
  off: ["unis"],
  onLabel: "div.",
  offLabel: "unis.",
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "div." }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "div." },
            { staff: 0, measure: 3, tick: 960, text: "unis." },
          ],
        },
      },
    ],
  },
});
