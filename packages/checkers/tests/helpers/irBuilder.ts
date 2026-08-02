import type { EventSpec, LintIR } from "@musescore-linter/core";
import { buildIR, CANONICAL } from "@musescore-linter/core";

// buildIR 本体は core（`packages/core/src/irBuilder.ts`）にある。ここはテスト用の
// fixture ヘルパーだけを持つ。
export type { EventSpec, IRSpec } from "@musescore-linter/core";
export { buildIR, CANONICAL };

const K = CANONICAL.elementKinds;
const BK = CANONICAL.barlineKinds;

/** 全チェッカーをパスするクリーンな最小 IR に追加イベントを加えたものを返す */
export function cleanIR(extra: EventSpec[] = []): LintIR {
	return buildIR({
		parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
		events: [
			{
				kind: K.TEMPO_TEXT,
				staff: 0,
				tick: 0,
				measure: 1,
				tempo: 2.0,
				textNorm: "allegro",
				textRaw: "Allegro",
			},
			{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
			{ kind: K.CHORD, staff: 1, tick: 0, measure: 1 },
			{
				kind: K.DYNAMIC,
				staff: 0,
				tick: 0,
				measure: 1,
				textNorm: "f",
				textRaw: "f",
			},
			{
				kind: K.DYNAMIC,
				staff: 1,
				tick: 0,
				measure: 1,
				textNorm: "f",
				textRaw: "f",
			},
			...extra,
		],
	});
}

/** 弦楽五重奏（Vn1/Vn2/Va/Vc/Cb）の 5 スタッフをパスするクリーン IR */
export function quintetIR(extra: EventSpec[] = []): LintIR {
	const staffNames = ["Vn1", "Vn2", "Va", "Vc", "Cb"];
	const chords = staffNames.map((_, i) => ({
		kind: K.CHORD,
		staff: i,
		tick: 0,
		measure: 1,
	}));
	const dynamics = staffNames.map((_, i) => ({
		kind: K.DYNAMIC,
		staff: i,
		tick: 0,
		measure: 1,
		textNorm: "f",
		textRaw: "f",
	}));
	return buildIR({
		parts: staffNames.map((name) => ({ partName: name })),
		events: [
			{
				kind: K.TEMPO_TEXT,
				staff: 0,
				tick: 0,
				measure: 1,
				tempo: 2.0,
				textNorm: "allegro",
				textRaw: "Allegro",
			},
			...chords,
			...dynamics,
			...extra,
		],
	});
}

export { BK, K };
