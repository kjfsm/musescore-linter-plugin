import { techniquePair } from "./support/techniquePairs.ts";

export const sordino = techniquePair({
  id: "sordino",
  name: "Con sord. / Senza sord.",
  description: "con sord.→senza sord. の対応漏れ・重複を検出",
  docs: "弱音器の対応漏れ・重複",
  on: ["con-sord"],
  off: ["senza-sord"],
  onLabel: "con sord.",
  offLabel: "senza sord.",
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "con sord." }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "con sord." },
            { staff: 0, measure: 3, tick: 960, text: "senza sord." },
          ],
        },
      },
    ],
  },
});
