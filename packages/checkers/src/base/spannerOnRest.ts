import type { LintIR } from "@musescore-linter/core";

export interface RestSpan {
  staffIdx: number;
  startTick: number;
  endTick: number;
}

export interface RestEndpointHit {
  staffIdx: number;
  endpoint: "開始" | "終了";
  tick: number;
  detail: Record<string, unknown>;
}

function tickSet(ir: LintIR, staffIdx: number, kind: string): Set<number> {
  const ids = ir.index.byStaffAndKind[staffIdx]?.[kind] ?? [];
  return new Set(ids.map((id) => ir.events[id].tick));
}

// スパナー(ヘアピン/スラー)の開始/終了 tick が、その staff で
// 「休符のみが存在し音符(chord)が無い」位置にある箇所を列挙する。
// スパナーの端点は原則として音符に掛かるべきで、休符上の端点は浄書ミスであることが多い。
export function findRestOnlyEndpoints(
  ir: LintIR,
  spans: RestSpan[],
  kind: "hairpin" | "slur",
  restKind: string,
  chordKind: string,
): RestEndpointHit[] {
  // staff ごとに rest/chord の tick 集合を遅延構築してキャッシュ
  const restCache: Record<number, Set<number>> = {};
  const chordCache: Record<number, Set<number>> = {};
  const restTicks = (staffIdx: number): Set<number> =>
    (restCache[staffIdx] ??= tickSet(ir, staffIdx, restKind));
  const chordTicks = (staffIdx: number): Set<number> =>
    (chordCache[staffIdx] ??= tickSet(ir, staffIdx, chordKind));

  // 休符のみ（音符なし）の位置か
  const onRestOnly = (staffIdx: number, tick: number): boolean =>
    restTicks(staffIdx).has(tick) && !chordTicks(staffIdx).has(tick);

  const hits: RestEndpointHit[] = [];
  for (const span of spans) {
    const detail = { kind, startTick: span.startTick, endTick: span.endTick };
    if (onRestOnly(span.staffIdx, span.startTick)) {
      hits.push({ staffIdx: span.staffIdx, endpoint: "開始", tick: span.startTick, detail });
    }
    if (onRestOnly(span.staffIdx, span.endTick)) {
      hits.push({ staffIdx: span.staffIdx, endpoint: "終了", tick: span.endTick, detail });
    }
  }
  return hits;
}
