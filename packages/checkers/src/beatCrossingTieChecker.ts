import type { Checker, Issue, LintIR, MeasureInfo, Severity } from "@musescore-linter/core";
import { createIssue, TICKS_PER_WHOLE } from "@musescore-linter/core";

import { getCanonical } from "./base/predicates.js";
import { buildPartNameMap } from "./base/query.js";

// 裏拍から始まった音符が拍境界をまたぐ記譜（イマジナリーバーライン違反）を検出する。
// 例: 4/4 の「付点8分 + 付点8分 + 8分」の 2 つ目は 2 拍目裏から 2 拍目境界をまたぐので、
// 「16分 + 8分」のタイに分割したほうが拍の骨格が見える。
//
// 判定は音符ごとに独立なので (staff, measure, voice) でグループ化はせず、
// ir.index.byKind[CHORD] を 1 パスするだけにしてある。走査対象の下限。

/** 拍子から導いた小節の枠組み。対象外の拍子・小節は null にして 1 比較で落とす。 */
interface Meter {
  startTick: number;
  ticks: number;
  /** 1 拍の tick 長。単純拍子は分母そのまま、複合拍子は付点音符 1 個分。 */
  beatUnit: number;
  /** 主要境界（4/4 の 3 拍目頭など）。ここをまたぐ違反は warning に上げる。 */
  primary: number;
  timeSig: string;
}

/** tick → 音価名。付点音符は 3/7 倍の位置に載る。ここに無い長さは分割案を出さない。 */
const DURATION_NAMES: Record<number, string> = {
  1920: "全音符",
  1440: "付点2分音符",
  960: "2分音符",
  720: "付点4分音符",
  480: "4分音符",
  360: "付点8分音符",
  240: "8分音符",
  180: "付点16分音符",
  120: "16分音符",
  90: "付点32分音符",
  60: "32分音符",
  30: "64分音符",
};

/**
 * 拍子 n/m から拍の枠組みを導く。対象外なら null。
 *
 * - 複合拍子: n % 3 === 0 かつ n > 3（6/8, 9/8, 12/8）。拍単位 = 付点音符 1 個分
 * - 単純拍子: それ以外（2/4, 3/4, 4/4。n = 3 は単純側に入る）
 * - 加算拍子（5/8, 7/8 等）と 15/8 以上の複合拍子は対象外
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

  // 拍数が偶数なら中央境界、奇数なら拍境界列の中間。1 本の式で両方を満たす。
  const primary = beatUnit * (Math.floor((numBeats - 1) / 2) + 1);

  return { startTick: info.startTick, ticks: info.ticks, beatUnit, primary, timeSig: `${n}/${d}` };
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
  description: "裏拍から始まり拍境界をまたぐ音符を検出（タイでの分割を推奨）",
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

    // フェーズ 2: chord を 1 パス。大半の音符は拍頭判定で即脱出する。
    for (const id of chordIds) {
      const ev = ir.events[id];
      const meter = meters[ev.measure];
      if (!meter) continue;

      const onset = ev.tick - meter.startTick;
      // 拍頭から始まる音符は何拍またごうと分割不要。最も安く最もよく効く早期脱出。
      if (onset % meter.beatUnit === 0) continue;

      const dur = ev.duration;
      if (!dur) continue;
      const q = dur.denominator;
      const p = dur.numerator;
      // 連符ガード。素（1）/ 付点（3）/ 複付点（7）以外は分割の議論ができない
      if (TICKS_PER_WHOLE % q !== 0) continue;
      if (p !== 1 && p !== 3 && p !== 7) continue;

      const end = onset + (TICKS_PER_WHOLE * p) / q;
      if (onset < 0 || end > meter.ticks) continue;

      // 次の拍境界が音符の途中に来るか。小節末の境界は end <= ticks の保証で決してまたげない
      if ((Math.floor(onset / meter.beatUnit) + 1) * meter.beatUnit >= end) continue;

      // ここから先は違反確定。確保が発生するのはこの経路だけ。
      const crossesPrimary = onset < meter.primary && meter.primary < end;
      const severity: Severity = crossesPrimary ? "warning" : "info";

      if (!partsByStaff) partsByStaff = buildPartNameMap(ir);
      const partName = partsByStaff.get(ev.staffIdx) ?? "";

      const segments = splitSegments(onset, end, meter.beatUnit);
      const before = DURATION_NAMES[end - onset];
      const after = describeSplit(segments);
      const suggestion =
        before && after ? `${before} → ${after}のタイに分割することを推奨します` : "";

      issues.push(
        createIssue(beatCrossingTieChecker, {
          severity,
          message:
            `${partName}: 拍の途中から始まる音符が拍境界をまたいでいます（${ev.measure}小節目）。` +
            suggestion,
          partName,
          staffIdx: ev.staffIdx,
          measure: ev.measure,
          tick: ev.tick,
          detail: {
            onsetTicks: onset,
            durationTicks: end - onset,
            suggestedSplit: segments,
            crossesPrimaryBoundary: crossesPrimary,
            timeSig: meter.timeSig,
          },
        }),
      );
    }

    return issues;
  },
};
