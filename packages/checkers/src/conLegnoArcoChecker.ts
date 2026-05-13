import { createTextPairChecker } from "./base/textPairChecker.js";

export const conLegnoArcoChecker = createTextPairChecker({
	id: "con-legno-arco",
	name: "Con legno / Arco",
	description: "弓の木部奏法(con legno)→通常奏法(arco)の対応漏れや重複を検知",
	category: "articulation",
	severity: "warning",
	defaultEnabled: true,
	onPatterns: ["con legno", "col legno"],
	offPatterns: ["arco", "ord.", "ord", "ordinario"],
	defaultState: "off",
	onLabel: "con legno",
	offLabel: "arco",
});
