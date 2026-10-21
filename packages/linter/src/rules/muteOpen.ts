import { techniquePair } from "./support/techniquePairs.ts";

// 弦の con sord. / senza sord. は sordino が受け持つ。ここは金管のミュートと手で塞ぐ奏法。
export const muteOpen = techniquePair({
  id: "mute-open",
  name: "Mute / Open",
  description: "ミュート指定→open 復帰の対応漏れ・重複を検出",
  docs: "金管の `mute`/`straight mute` 等 → `open` 復帰の対応漏れ・重複",
  on: ["mute"],
  off: ["open", "ord", "natural"],
  onLabel: "mute",
  offLabel: "open",
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, measure: 2, tick: 480, text: "mute" }] } }],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "mute" },
            { staff: 0, measure: 3, tick: 960, text: "open" },
          ],
        },
      },
    ],
  },
});
