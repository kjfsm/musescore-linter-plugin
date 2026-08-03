import { createTextPairChecker } from "./base/textPairChecker.js";

export const soloTuttiChecker = createTextPairChecker({
  id: "solo-tutti",
  name: "Solo / Tutti",
  description: "solo/tutti の対応漏れ・重複を検出",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPatterns: ["solo", "soli"],
  offPatterns: ["tutti"],
  defaultState: "off",
  onLabel: "solo",
  offLabel: "tutti",
  // solo が連続して指示される（tutti を挟まない二連ソロ）のは実際の記譜でも起こりうるため info に留める。
  onDuplicateSeverity: "info",
});
