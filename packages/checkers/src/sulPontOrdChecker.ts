import { createTextPairChecker } from "./base/textPairChecker.js";

export const sulPontOrdChecker = createTextPairChecker({
	id: "sul-pont-ord",
	name: "Sul pont. / Ord.",
	description: "駒寄り奏法(sul pont.)→通常奏法(ord.)の対応漏れや重複を検知",
	category: "articulation",
	severity: "warning",
	defaultEnabled: true,
	onPatterns: ["sul pont.", "sul pont", "sul ponticello"],
	offPatterns: ["ord.", "ord", "ordinario", "arco"],
	defaultState: "off",
	onLabel: "sul pont.",
	offLabel: "ord.",
});
