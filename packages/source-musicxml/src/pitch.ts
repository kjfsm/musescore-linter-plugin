/** 音名（0=C ... 6=B）ごとの、C から数えた五度圏上の位置。 */
const FIFTHS_BY_STEP: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: -1,
	G: 1,
	A: 3,
	B: 5,
};

/** 音名 → 半音（C からの距離）。 */
const SEMITONE_BY_STEP: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

/** 音名 → ダイアトニックのステップ番号（0=C ... 6=B）。 */
const STEP_INDEX: Record<string, number> = {
	C: 0,
	D: 1,
	E: 2,
	F: 3,
	G: 4,
	A: 5,
	B: 6,
};

/** MusicXML の step/alter/octave から MIDI 音高（0-127）。不明なら -1。 */
export function toMidiPitch(
	step: string,
	alter: number,
	octave: number,
): number {
	const semitone = SEMITONE_BY_STEP[step];
	if (semitone === undefined) return -1;
	const pitch = (octave + 1) * 12 + semitone + alter;
	return pitch >= 0 && pitch <= 127 ? pitch : -1;
}

/**
 * MusicXML の step/alter から TPC（tonal pitch class）。core の `tpcToStep` / `tpcToAlter` の
 * 逆関数で、C = 14・五度圏 1 つで +1・変化記号 1 つで ±7 という MuseScore の採番に合わせる。
 */
export function toTpc(step: string, alter: number): number {
	const fifths = FIFTHS_BY_STEP[step];
	if (fifths === undefined) return 14;
	return 14 + fifths + 7 * Math.round(alter);
}

export interface ClefState {
	/** 五線の最上線が表すダイアトニック絶対位置（octave * 7 + stepIndex）。 */
	topLineAbsStep: number;
}

/** ト音記号（G clef, 第2線）。`<clef>` が現れるまでの既定値。 */
export const DEFAULT_CLEF: ClefState = { topLineAbsStep: 38 }; // F5

const CLEF_REFERENCE: Record<string, { absStep: number; defaultLine: number }> =
	{
		// G clef は第 defaultLine 線が G4、F clef は F3、C clef は C4 を表す
		G: { absStep: 4 * 7 + STEP_INDEX.G, defaultLine: 2 },
		F: { absStep: 3 * 7 + STEP_INDEX.F, defaultLine: 4 },
		C: { absStep: 4 * 7 + STEP_INDEX.C, defaultLine: 3 },
	};

/**
 * `<clef>` の sign / line / clef-octave-change から譜表状態を作る。
 * 認識できない sign（TAB / percussion 等）は音高の意味を持たないので既定のト音記号として扱う。
 */
export function clefFrom(
	sign: string,
	line: number | undefined,
	octaveChange: number | undefined,
): ClefState {
	const ref = CLEF_REFERENCE[sign];
	if (!ref) return DEFAULT_CLEF;
	const staffLine = line ?? ref.defaultLine;
	// 五線の第5線（最上線）は基準線から (5 - staffLine) 本ぶん上 = ダイアトニック 2 ステップ/本
	const topLineAbsStep =
		ref.absStep + (5 - staffLine) * 2 + 7 * (octaveChange ?? 0);
	return { topLineAbsStep };
}

/**
 * 譜表上の位置。0 = 最上線、下方向へダイアトニック 1 ステップごとに +1（線と間で +1 ずつ）。
 *
 * MuseScore の `Note.line` と同じ「上ほど小さい・1 ステップ 1」という尺度だが、原点
 * （どの音を 0 とするか）は MuseScore 内部の採番と一致しない可能性がある。この値を使う
 * checker は `courtesy-accidental` のみで、同一譜表内での一致判定にしか使わないため
 * 判定結果には影響しない。
 */
export function toStaffLine(
	clef: ClefState,
	step: string,
	octave: number,
): number {
	const stepIndex = STEP_INDEX[step];
	if (stepIndex === undefined) return 0;
	return clef.topLineAbsStep - (octave * 7 + stepIndex);
}
