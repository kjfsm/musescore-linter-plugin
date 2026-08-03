import type { LintEvent, LintIR } from "@musescore-linter/core";

/** tick に対応する小節番号。見つからなければ 0。 */
export function measureAtTick(ir: LintIR, tick: number): number {
  const ids = ir.index.byTick[String(tick)] ?? [];
  for (const id of ids) {
    const ev = ir.events[id];
    if (ev.measure > 0) return ev.measure;
  }
  return 0;
}

/** staffIdx → partName のマップ。ir.meta.parts から構築する。 */
export function buildPartNameMap(ir: LintIR): Map<number, string> {
  const map = new Map<number, string>();
  for (const part of ir.meta?.parts ?? []) {
    map.set(part.staffIdx, part.partName);
  }
  return map;
}

/**
 * (staff, measure, voice) の chord イベントを tick 昇順で返す。返り値は ir.derived が持つ
 * 配列そのものなので、呼び出し側で書き換えてはいけない。
 *
 * ensureDerived が事前に索引を作る。小節ごとに呼ばれると staff 全体の chord を毎回
 * filter + sort することになり、実測でこの経路だけがチェッカー全体の 8 割を占めていた。
 */
export function chordsIn(
  ir: LintIR,
  staffIdx: number,
  measure: number,
  voice: number,
): LintEvent[] {
  return ir.derived?.chordsByStaffMeasure?.[`${staffIdx}:${measure}:${voice}`] ?? [];
}

/** (staff, measure, voice) のリズム署名。無ければ undefined。 */
export function rhythmSignature(
  ir: LintIR,
  staffIdx: number,
  measure: number,
  voice: number,
): string | undefined {
  return ir.derived?.rhythmByStaffMeasure?.[`${staffIdx}:${measure}:${voice}`];
}

/** chord イベントに付いたアーティキュレーション名（無ければ []）。 */
export function articulationsOf(ir: LintIR, chordId: number): string[] {
  return ir.derived?.articulationsByChordId?.[chordId] ?? [];
}

/**
 * MuseScore の subtypeName() は符尾方向により「上スタッカート」「下スタッカート」等の
 * 配置違いバリアントを返すが、音楽的には同一の記号なので比較時は接頭辞を除去して同一視する。
 */
export function normalizeArticulationName(name: string): string {
  return name.replace(/^[上下]/, "");
}

/** tick が staff/voice のスラーに含まれるか。 */
export function slurCoversTick(ir: LintIR, staffIdx: number, voice: number, tick: number): boolean {
  const slurs = ir.derived?.slursByStaff?.[staffIdx] ?? [];
  return slurs.some((s) => s.voice === voice && s.startTick <= tick && tick < s.endTick);
}

/** tick が staff/voice のタイに含まれるか。 */
export function tieCoversTick(ir: LintIR, staffIdx: number, voice: number, tick: number): boolean {
  const ties = ir.derived?.tiesByStaff?.[staffIdx] ?? [];
  return ties.some((t) => t.voice === voice && t.startTick <= tick && tick < t.endTick);
}

/**
 * measure/voice で同じリズム署名を持つ staffIdx のグループ（サイズ >= 2）を返す。
 *
 * `groupKeyOf` を渡すと、同じリズムでも別グループの譜表は同じバケツに入らなくなる
 * （`null` を返した譜表は列挙から外れる）。省略時は全パート横断。
 *
 * バケツを `groupKey → sig` の 2 段にしているのは意図的で、`` `${gk}:${sig}` `` の連結キーに
 * してはいけない。リズム署名は小節内の全音符を連結した文字列（16 分主体の小節では数百文字）で、
 * 連結すると「パート数 × 小節数」回そのコピーとハッシュが走る。
 */
export function staffGroupsSharingRhythm(
  ir: LintIR,
  measure: number,
  voice: number,
  groupKeyOf?: (staffIdx: number) => string | null,
): number[][] {
  const byGroup = new Map<string, Map<string, number[]>>();
  for (const part of ir.meta?.parts ?? []) {
    const groupKey = groupKeyOf ? groupKeyOf(part.staffIdx) : "";
    if (groupKey === null) continue;
    const sig = rhythmSignature(ir, part.staffIdx, measure, voice);
    if (!sig) continue;
    let bySig = byGroup.get(groupKey);
    if (!bySig) {
      bySig = new Map();
      byGroup.set(groupKey, bySig);
    }
    const bucket = bySig.get(sig);
    if (bucket) bucket.push(part.staffIdx);
    else bySig.set(sig, [part.staffIdx]);
  }

  const out: number[][] = [];
  for (const bySig of byGroup.values()) {
    for (const group of bySig.values()) {
      if (group.length >= 2) out.push(group.sort((a, b) => a - b));
    }
  }
  return out;
}
