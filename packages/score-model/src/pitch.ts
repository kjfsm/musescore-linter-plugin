// TPC（tonal pitch class, 五度圏に基づく音高綴り。C = 14）を扱う純粋関数。
// SDK の Note.tpc をそのまま受け取り、音名・変化量を導出する。
//
// 有効な TPC の範囲は -1（Fbb）〜 33（Bx）の 35 値（変化量 -2..+2 の 5 段 × 文字 7 種）。
// tpcToStep / tpcToAlter はこの範囲外の値にも数式上は答えを返すが、MuseScore が
// 実際に生成する TPC はこの範囲に収まる。

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

/**
 * 音名の文字（"C".."B"）。導出不能な値は "?"。
 *
 * `toTpc` が受け取るのは文字なので、`tpcToStep` の番号との間にこの対応表が要る。
 * 表を呼び出し側に持たせると `toTpc(tpcToLetter(t), tpcToAlter(t)) === t` という
 * 逆関数の関係が外からは組み立てられなくなるので、ここで公開しておく。
 */
export function tpcToLetter(tpc: number): string {
  return STEP_LETTERS[tpcToStep(tpc)] ?? "?";
}

const ALTER_SUFFIX: Record<string, string> = {
  "-2": "bb",
  "-1": "b",
  "0": "",
  "1": "#",
  "2": "##",
};

/** 音名（例: "F#", "Bb", "C"）。導出不能な値は "?"。 */
export function tpcToName(tpc: number): string {
  const letter = tpcToLetter(tpc);
  const suffix = ALTER_SUFFIX[String(tpcToAlter(tpc))];
  return suffix === undefined ? "?" : `${letter}${suffix}`;
}

/** 音名（0=C ... 6=B）ごとの、C から数えた五度圏上の位置。tpcToStep の逆写像に使う。 */
const FIFTHS_BY_STEP: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: -1,
  G: 1,
  A: 3,
  B: 5,
};

/**
 * step/alter から TPC（tonal pitch class）。`tpcToStep` / `tpcToAlter` の逆関数で、
 * C = 14・五度圏 1 つで +1・変化記号 1 つで ±7 という MuseScore の採番に合わせる。
 * MusicXML の step（"C".."B"）と MuseScore の Note.tpc の変換の両方で使う。
 */
export function toTpc(step: string, alter: number): number {
  const fifths = FIFTHS_BY_STEP[step];
  if (fifths === undefined) return 14;
  return 14 + fifths + 7 * Math.round(alter);
}
