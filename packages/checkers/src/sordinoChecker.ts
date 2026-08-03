import { createTextPairChecker } from "./base/textPairChecker.js";

export const sordinoChecker = createTextPairChecker({
  id: "sordino",
  name: "Con sord. / Senza sord.",
  description: "con sord.→senza sord. の対応漏れ・重複を検出",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPatterns: ["con sord.", "con sord", "con sordino"],
  offPatterns: ["senza sord.", "senza sord", "senza sordino"],
  defaultState: "off",
  onLabel: "con sord.",
  offLabel: "senza sord.",
});
