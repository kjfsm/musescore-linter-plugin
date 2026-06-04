import { createTextPairChecker } from "./base/textPairChecker.js";

// ハープ: près de la table(響板寄りで弾く金属的な奏法)→ ordinario(通常奏法)復帰の対応漏れ・重複を検知。
export const harpTableChecker = createTextPairChecker({
	id: "harp-table",
	name: "Près de la table / Ord.",
	description:
		"ハープの près de la table(響板寄り奏法)→ 通常奏法(ordinario)復帰の対応漏れや重複を検知",
	category: "articulation",
	severity: "warning",
	defaultEnabled: true,
	onPatterns: ["près de la table", "pres de la table", "p.d.l.t.", "pdlt"],
	offPatterns: [
		"ordinario",
		"ord.",
		"ord",
		"naturale",
		"nat.",
		"modo ordinario",
	],
	defaultState: "off",
	onLabel: "près de la table",
	offLabel: "ordinario",
});
