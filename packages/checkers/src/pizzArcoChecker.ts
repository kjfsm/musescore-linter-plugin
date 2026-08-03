import { createTextPairChecker } from "./base/textPairChecker.js";

export const pizzArcoChecker = createTextPairChecker({
  id: "pizz-arco",
  name: "Pizz / Arco",
  description: "pizz.→arco の順序の乱れ・対応漏れを検出",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPatterns: ["pizz.", "pizz", "pizzicato"],
  offPatterns: ["arco"],
  defaultState: "off",
  onLabel: "pizz.",
  offLabel: "arco",
});
