import { createTextPairChecker } from "./base/textPairChecker.js";

export const divisiChecker = createTextPairChecker({
  id: "div-unis",
  name: "Div. / Unis.",
  description: "div.→unis. の対応漏れ・重複を検出",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPatterns: ["div.", "div", "divisi"],
  offPatterns: ["unis.", "unis", "unisono"],
  defaultState: "off",
  onLabel: "div.",
  offLabel: "unis.",
});
