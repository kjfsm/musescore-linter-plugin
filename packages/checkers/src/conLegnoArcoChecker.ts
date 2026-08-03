import { createTextPairChecker } from "./base/textPairChecker.js";

export const conLegnoArcoChecker = createTextPairChecker({
  id: "con-legno-arco",
  name: "Con legno / Arco",
  description: "con legno→arco の対応漏れ・重複を検出",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPatterns: ["con legno", "col legno"],
  offPatterns: ["arco", "ord.", "ord", "ordinario"],
  defaultState: "off",
  onLabel: "con legno",
  offLabel: "arco",
});
