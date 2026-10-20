/** MusicXML の `<type>` → 全音符を 1 とした分母。 */
const DENOMINATOR_BY_TYPE: Record<string, number> = {
  maxima: 1 / 8,
  long: 1 / 4,
  breve: 1 / 2,
  whole: 1,
  half: 2,
  quarter: 4,
  eighth: 8,
  "16th": 16,
  "32nd": 32,
  "64th": 64,
  "128th": 128,
  "256th": 256,
  "512th": 512,
  "1024th": 1024,
};

export interface Fraction {
  numerator: number;
  denominator: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

export function reduce(numerator: number, denominator: number): Fraction {
  const g = gcd(numerator, denominator);
  return { numerator: numerator / g, denominator: denominator / g };
}

/**
 * `<type>` と付点の数から表示上の音価を返す。
 * MuseScore の `element.duration`（全音符を 1 とする既約分数）と同じ表現。
 */
export function durationFromType(type: string | undefined, dots: number): Fraction | undefined {
  if (!type) return undefined;
  const base = DENOMINATOR_BY_TYPE[type];
  if (base === undefined) return undefined;

  // 付点 n 個 = 元の音価 × (2^(n+1) - 1) / 2^n
  const factor = 2 ** dots;
  const numerator = 2 * factor - 1;
  const denominator = base * factor;
  // base が 1 未満（breve 以上）のときは分母が小数になるので整数化する
  if (!Number.isInteger(denominator)) {
    const scale = 1 / base;
    return reduce(numerator * scale, factor);
  }
  return reduce(numerator, denominator);
}

/**
 * `<type>` が無い音符（MusicXML では省略可能）向けのフォールバック。
 * `<duration>`（divisions 単位）を全音符 1 の分数に直す。
 */
export function durationFromDivisions(duration: number, divisions: number): Fraction | undefined {
  if (!Number.isFinite(duration) || duration <= 0 || divisions <= 0) {
    return undefined;
  }
  return reduce(duration, divisions * 4);
}
