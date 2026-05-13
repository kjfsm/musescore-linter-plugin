import { createTextPairChecker } from "./base/textPairChecker.js";

export const sulTastoOrdChecker = createTextPairChecker({
	id: "sul-tasto-ord",
	name: "Sul tasto / Ord.",
	description:
		"駒から離れた奏法(sul tasto)→通常奏法(ord.)の対応漏れや重複を検知",
	category: "articulation",
	severity: "warning",
	defaultEnabled: true,
	onPatterns: ["sul tasto", "sul tasto."],
	offPatterns: ["ord.", "ord", "ordinario", "arco"],
	defaultState: "off",
	onLabel: "sul tasto",
	offLabel: "ord.",
});
