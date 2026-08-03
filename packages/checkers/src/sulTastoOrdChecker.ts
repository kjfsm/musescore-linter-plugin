import { createTextPairChecker } from "./base/textPairChecker.js";

export const sulTastoOrdChecker = createTextPairChecker({
  id: "sul-tasto-ord",
  name: "Sul tasto / Ord.",
  description: "sul tasto→ord. の対応漏れ・重複を検出",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPatterns: ["sul tasto", "sul tasto."],
  offPatterns: ["ord.", "ord", "ordinario", "arco"],
  defaultState: "off",
  onLabel: "sul tasto",
  offLabel: "ord.",
});
