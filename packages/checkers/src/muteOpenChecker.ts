import { createTextPairChecker } from "./base/textPairChecker.js";

// 金管（および手で塞ぐ奏法）のミュート指定 → open 戻しの対応漏れ・重複を検知。
// 弦の con sord./senza sord. は sordinoChecker が担当するため、ここでは英語系/ジャズ系の
// "mute" / "straight mute" / "cup mute" / "harmon" / "stopped" 等を対象にする。
export const muteOpenChecker = createTextPairChecker({
	id: "mute-open",
	name: "Mute / Open",
	description:
		"金管のミュート指定(mute / straight mute / cup mute / harmon / stopped 等)→ open 復帰の対応漏れや重複を検知",
	category: "articulation",
	severity: "warning",
	defaultEnabled: true,
	onPatterns: [
		"mute",
		"con mute",
		"straight mute",
		"cup mute",
		"harmon mute",
		"harmon",
		"bucket mute",
		"plunger",
		"stopped",
		"chiuso",
		"+",
	],
	offPatterns: ["open", "senza mute", "ord.", "ord", "ordinario", "naturale"],
	defaultState: "off",
	onLabel: "mute",
	offLabel: "open",
});
