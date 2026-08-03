import { createTextPairChecker } from "./base/textPairChecker.js";

export const soloTuttiChecker = createTextPairChecker({
  id: "solo-tutti",
  name: "Solo / Tutti",
  description:
    "solo/soli と tutti の対応関係を確認し、重複や戻し忘れを検知（solo の二連続は info）",
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
