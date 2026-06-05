// TPC（tonal pitch class, 五度圏に基づく音高綴り。C = 14）を扱う純粋関数。
// SDK の Note.tpc をそのまま受け取り、音名・変化量を導出する。

/** 音名のステップ（0=C, 1=D, ... 6=B）。 */
export function tpcToStep(tpc: number): number {
	const fifthsFromC = (((tpc - 14) % 7) + 7) % 7;
	return (fifthsFromC * 4) % 7;
}

/** 変化量（-2..+2、フラットが負・シャープが正、0 はナチュラル）。 */
export function tpcToAlter(tpc: number): number {
	return Math.floor((tpc + 1) / 7) - 2;
}

const STEP_LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const ALTER_SUFFIX: Record<string, string> = {
	"-2": "bb",
	"-1": "b",
	"0": "",
	"1": "#",
	"2": "##",
};

/** 音名（例: "F#", "Bb", "C"）。導出不能な値は "?"。 */
export function tpcToName(tpc: number): string {
	const letter = STEP_LETTERS[tpcToStep(tpc)] ?? "?";
	const suffix = ALTER_SUFFIX[String(tpcToAlter(tpc))];
	return suffix === undefined ? "?" : `${letter}${suffix}`;
}
