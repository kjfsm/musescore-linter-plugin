import type { Checker, Issue, LintIR, MeasureInfo, Severity } from "@musescore-linter/core";
import { createIssue, TICKS_PER_WHOLE } from "@musescore-linter/core";

import { getCanonical } from "./base/predicates.js";
import { buildPartNameMap } from "./base/query.js";

// 拍の骨格を隠す音符（イマジナリーバーライン違反）を検出し、タイでの分割案を出す。
//
// 規則は境界の強さの順に 3 段構え:
//   - 小節線をまたぐ音符は例外なく分割必須（最強の境界）。ただし MuseScore / MusicXML の
//     データモデルでは 1 つの音符が小節線を越えられない（越える場合はタイ 2 音で表現される）ので、
//     実際に発火するのは破損小節など異常データのときだけ。規則の完全性のために残してある。
//   - 主要境界（偶数拍子の小節の中央）をまたぐ音符は、小節の頭から始まるものだけが例外。
//     例: 4/4 の 2 拍目からの付点4分音符は拍頭始まりでも 3 拍目を隠すので「4分 ⌣ 8分」。
//   - それ以外の拍境界は、拍の途中から始まる音符がまたぐ場合に分割を推奨。
//     例: 4/4 の「付点8分 + 付点8分 + 8分」の 2 つ目（1 拍目の付点8分後から開始）は「16分 ⌣ 8分」。
//
// 判定は音符ごとに独立なので (staff, measure, voice) でグループ化はせず、
// ir.index.byKind[CHORD] を 1 パスするだけにしてある。走査対象の下限。

/** 拍子から導いた小節の枠組み。対象外の拍子・小節は null にして 1 比較で落とす。 */
interface Meter {
  startTick: number;
  ticks: number;
  /** 1 拍の tick 長。単純拍子は分母そのまま、複合拍子は付点音符 1 個分。 */
  beatUnit: number;
  /**
   * 小節の中央（4/4 の 3 拍目頭、6/8 の 2 拍目頭など）。ここをまたぐ音符は
   * 拍頭始まりでも分割必須で、severity も warning に上げる。
   *
   * 奇数拍子（3/4・9/8）に中央は実在しないので -1（＝決してまたげない）にする。
   * 中間の拍境界を中央とみなすと、3/4 の「4分+2分」のような標準的な記譜まで
   * 違反になってしまうため。
   */
  primary: number;
  /** 複合拍子か。拍位置ラベルで「裏」を使ってよいかの判定に使う。 */
  isCompound: boolean;
  timeSig: string;
}

/** tick → 音価名。付点は 3/2 倍、複付点は 7/4 倍の位置に載る。ここに無い長さは分割案を出さない。 */
const DURATION_NAMES: Record<number, string> = {
  1920: "全音符",
  1680: "複付点2分音符",
  1440: "付点2分音符",
  960: "2分音符",
  840: "複付点4分音符",
  720: "付点4分音符",
  480: "4分音符",
  420: "複付点8分音符",
  360: "付点8分音符",
  240: "8分音符",
  210: "複付点16分音符",
  180: "付点16分音符",
  120: "16分音符",
  90: "付点32分音符",
  60: "32分音符",
  30: "64分音符",
};

/**
 * 通常の音価（素・付点・複付点）の分母は必ず 2 の冪になる。連符はここで落ちる
 * （3連符は 6/12/24、5連符は 10/20/40 …）。
 *
 * 1920 = 2^7 × 3 × 5 なので `1920 % q === 0` は連符ガードにならない点に注意
 * （3連8分 = 1/12 は 1920 % 12 === 0 を通ってしまう）。
 */
function isPowerOfTwo(x: number): boolean {
  return x > 0 && (x & (x - 1)) === 0;
}

/**
 * 分子が「素（1）/ 付点（3）/ 複付点（7）の 2 の冪倍」か。
 * breve = 2/1、longa = 4/1 のように全音符より長い音価は既約分数で分子が 2 の冪倍になるので、
 * 1/3/7 の固定比較では落ちてしまう。
 */
function isNoteValueNumerator(p: number): boolean {
  let x = p;
  while (x > 0 && x % 2 === 0) x /= 2;
  return x === 1 || x === 3 || x === 7;
}

/**
 * 拍子 n/m から拍の枠組みを導く。対象外なら null。
 *
 * - 複合拍子: n % 3 === 0 かつ n > 3、n ∈ {6, 9, 12}（6/8, 9/8, 12/8, 6/4 …）。
 *   拍単位 = 付点音符 1 個分
 * - 単純拍子: それ以外で n ∈ {2, 3, 4}（2/4, 3/4, 4/4, 2/2, 3/8 …。n = 3 は単純側）
 * - 加算拍子（5/8, 7/8 等）と 15/8 以上の複合拍子は対象外
 *
 * 分母 d は 1920 を割り切るものすべて（1〜128）を受け入れる。拍の数え方は n だけで
 * 決まり d は tick 尺度にしか効かないので、拍子の列挙を分子側に限っている。
 */
function toMeter(info: MeasureInfo): Meter | null {
  const n = info.timeSigN;
  const d = info.timeSigD;
  if (!Number.isInteger(TICKS_PER_WHOLE / d)) return null;

  // アウフタクト・不完全小節は拍の数え方が変わるので対象外
  if (info.ticks !== (TICKS_PER_WHOLE * n) / d) return null;

  const isCompound = n % 3 === 0 && n > 3;
  if (isCompound) {
    if (n !== 6 && n !== 9 && n !== 12) return null;
  } else if (n !== 2 && n !== 3 && n !== 4) {
    return null;
  }

  const beatUnit = isCompound ? (3 * TICKS_PER_WHOLE) / d : TICKS_PER_WHOLE / d;
  const numBeats = isCompound ? n / 3 : n;

  // 中央は拍数が偶数のときだけ実在する。奇数拍子は -1 にして「決してまたげない」を表す。
  const primary = numBeats % 2 === 0 ? beatUnit * (numBeats / 2) : -1;

  return {
    startTick: info.startTick,
    ticks: info.ticks,
    beatUnit,
    primary,
    isCompound,
    timeSig: `${n}/${d}`,
  };
}

/**
 * 小節内での開始位置。「2拍目裏」「1拍目+付点8分音符」のように、同じ小節に同じ音価の
 * 違反が複数あってもどの音符かを一意に指せる粒度にする。
 * 複合拍子の 1 拍は付点音符なので「裏」とは呼ばず、常にオフセットの音価で示す。
 */
function beatPositionLabel(onset: number, meter: Meter): string {
  const beat = Math.floor(onset / meter.beatUnit) + 1;
  const rem = onset % meter.beatUnit;
  if (rem === 0) return `${beat}拍目`;
  if (!meter.isCompound && rem === meter.beatUnit / 2) return `${beat}拍目裏`;
  const name = DURATION_NAMES[rem];
  return name ? `${beat}拍目+${name}` : `${beat}拍目+${rem}tick`;
}

/** またいだ境界。「2拍目の頭」「3・4拍目の頭」「小節線」。 */
function crossedBoundariesLabel(
  onset: number,
  end: number,
  beatUnit: number,
  crossesBarline: boolean,
): string {
  const beats: number[] = [];
  for (let b = (Math.floor(onset / beatUnit) + 1) * beatUnit; b < end; b += beatUnit) {
    beats.push(b / beatUnit + 1);
  }
  const beatLabel = beats.length > 0 ? `${beats.join("・")}拍目の頭` : "";
  if (!crossesBarline) return beatLabel;
  return beatLabel ? `${beatLabel}と小節線` : "小節線";
}

/** onset から音符を拍境界ごとに割ったときの各断片の長さ。 */
function splitSegments(onset: number, end: number, beatUnit: number): number[] {
  const segments: number[] = [];
  let cursor = onset;
  let boundary = (Math.floor(onset / beatUnit) + 1) * beatUnit;
  while (boundary < end) {
    segments.push(boundary - cursor);
    cursor = boundary;
    boundary += beatUnit;
  }
  segments.push(end - cursor);
  return segments;
}

/** 「16分音符+8分音符のタイ」。1 つでも名前の無い長さがあれば null。 */
function describeSplit(segments: number[]): string | null {
  const names: string[] = [];
  for (const seg of segments) {
    const name = DURATION_NAMES[seg];
    if (name === undefined) return null;
    names.push(name);
  }
  return names.join("+");
}

export const beatCrossingTieChecker: Checker = {
  id: "beat-crossing-tie",
  name: "拍をまたぐ音符の分割",
  description:
    "拍境界をまたぐ音符を検出（小節の中央をまたぐ場合は小節頭始まりのみ許容）。タイでの分割を推奨",
  category: "notation",
  severity: "info",
  defaultEnabled: true,
  run(ir: LintIR): Issue[] {
    const measures = ir.meta?.measures ?? [];
    if (measures.length === 0) return [];

    // フェーズ 1: 小節番号を添字とする密な配列。以降は添字 1 回で拍の枠組みが引ける。
    const meters: (Meter | null)[] = [];
    for (const info of measures) {
      meters[info.measure] = toMeter(info);
    }

    const canonical = getCanonical(ir);
    if (!canonical) return [];
    const chordIds = ir.index?.byKind?.[canonical.elementKinds.CHORD] ?? [];
    const issues: Issue[] = [];
    // 違反ゼロの譜面では Map を作らずに済ませる
    let partsByStaff: Map<number, string> | null = null;

    // フェーズ 2: chord を 1 パス。大半の音符は「境界をまたがない」判定で脱出する。
    for (const id of chordIds) {
      const ev = ir.events[id];
      const meter = meters[ev.measure];
      if (!meter) continue;

      // 連符はブラケット自体がグルーピングを示すので、境界判定より前に対象外にする。
      if (ev.tuplet) continue;

      const onset = ev.tick - meter.startTick;
      if (onset < 0) continue;

      const dur = ev.duration;
      if (!dur) continue;
      const q = dur.denominator;
      const p = dur.numerator;
      // 連符フラグを持たないソース向けの保険。分母が 2 の冪でなければ連符。
      // 1920 % q === 0 は連符を弾けない（1920 に 3 と 5 の因数があるため）ので別途必要。
      if (!isPowerOfTwo(q)) continue;
      // 256 分音符以下は tick が非整数になるので落とす
      if (TICKS_PER_WHOLE % q !== 0) continue;
      // 素 / 付点 / 複付点 以外の比率は音価として扱わない
      if (!isNoteValueNumerator(p)) continue;

      const durTicks = (TICKS_PER_WHOLE * p) / q;
      const end = onset + durTicks;
      const rem = onset % meter.beatUnit;
      // 奇数拍子は primary = -1 なので常に false。
      const crossesPrimary = onset < meter.primary && meter.primary < end;

      // 小節線は最強の境界。またぐ音符は例外なく分割が必要なので、拍の判定より先に決める。
      const crossesBarline = end > meter.ticks;
      if (!crossesBarline) {
        // 小節の頭（downbeat）から始まる音符は、中央をまたごうと内部構造を隠さない。
        // 拍の規則に対する唯一の例外。
        if (onset === 0) continue;
        // 拍内オフセット rem に対し、次の境界までは beatUnit - rem。
        // またぐ条件は rem + durTicks > beatUnit。除算 1 回でまたぎ判定と拍頭判定を兼ねる。
        if (rem + durTicks <= meter.beatUnit) continue;
        // 中央をまたぐなら拍頭始まりでも分割が必要。
        if (!crossesPrimary && rem === 0) continue;
      }

      // ここから先は違反確定。確保が発生するのはこの経路だけ。
      const severity: Severity = crossesBarline || crossesPrimary ? "warning" : "info";

      if (!partsByStaff) partsByStaff = buildPartNameMap(ir);
      const partName = partsByStaff.get(ev.staffIdx) ?? "";

      // 小節線をまたぐ場合は、まず小節線で切り、残りを次の小節の音符として扱う。
      // 次の小節の拍子は別なので、ここでは残りを 1 断片として出すに留める。
      const inMeasureEnd = crossesBarline ? meter.ticks : end;
      const segments = splitSegments(onset, inMeasureEnd, meter.beatUnit);
      if (crossesBarline) segments.push(end - meter.ticks);

      const position = beatPositionLabel(onset, meter);
      const crossed = crossedBoundariesLabel(onset, inMeasureEnd, meter.beatUnit, crossesBarline);
      const noteName = DURATION_NAMES[durTicks] ?? "音符";
      const after = describeSplit(segments);
      const suggestion = after ? `${after}のタイに分割することを推奨します` : "";

      issues.push(
        createIssue(beatCrossingTieChecker, {
          severity,
          message:
            `${partName}: ${ev.measure}小節目 ${position} から始まる${noteName}が${crossed}をまたいでいます。` +
            suggestion,
          partName,
          staffIdx: ev.staffIdx,
          measure: ev.measure,
          tick: ev.tick,
          detail: {
            position,
            crossedBeats: crossed,
            onsetTicks: onset,
            durationTicks: durTicks,
            suggestedSplit: segments,
            crossesPrimaryBoundary: crossesPrimary,
            crossesBarline,
            timeSig: meter.timeSig,
          },
        }),
      );
    }

    return issues;
  },
};
