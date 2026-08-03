import { createTextPairChecker } from "./base/textPairChecker.js";

export const sulPontOrdChecker = createTextPairChecker({
  id: "sul-pont-ord",
  name: "Sul pont. / Ord.",
  description: "sul pont.→ord. の対応漏れ・重複を検出",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPatterns: ["sul pont.", "sul pont", "sul ponticello"],
  offPatterns: ["ord.", "ord", "ordinario", "arco"],
  defaultState: "off",
  onLabel: "sul pont.",
  offLabel: "ord.",
});
