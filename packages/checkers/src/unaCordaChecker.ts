import { createTextPairChecker } from "./base/textPairChecker.js";

// ピアノの左ペダル: una corda(弱音ペダル踏み) → tre corde(解除) の対応漏れ・重複を検知。
export const unaCordaChecker = createTextPairChecker({
  id: "una-corda",
  name: "Una corda / Tre corde",
  description: "una corda→tre corde 復帰の対応漏れ・重複を検出",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPatterns: ["una corda", "u.c."],
  offPatterns: ["tre corde", "tutte le corde", "t.c."],
  defaultState: "off",
  onLabel: "una corda",
  offLabel: "tre corde",
});
