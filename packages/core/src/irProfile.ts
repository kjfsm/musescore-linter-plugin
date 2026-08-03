import { CANONICAL } from "./enumRegistry.js";
import type { LintIR } from "./types.js";

/**
 * LintIR の「契約として満たしていてほしい性質」を数え上げたもの。
 *
 * MuseScore 経路と MusicXML 経路は同じ LintIR を作ることになっているが、実際には
 * 片方だけが埋めるフィールドや、片方だけが生成する kind がある。checker は入力ソースを
 * 知らないので、その差はそのまま「ソースによって動いたり動かなかったりする checker」に
 * 化ける。
 *
 * イベントを 1 件ずつ突き合わせるのではなく、こういう性質の分布で比べるのは、
 * .mscz を Node で読めない（MuseScore 経路の IR は手書きモックからしか作れない）以上、
 * 同一楽譜の完全一致比較が原理的にできないため。分布なら小さなモックでも意味を持つ。
 */
export interface IRProfile {
  eventCount: number;
  /** 出現した kind（昇順・重複なし）。片方のソースだけが作る kind を炙り出す。 */
  kinds: string[];
  /** scope: "global"（staffIdx === -1）のイベントがあるか。 */
  hasGlobalScope: boolean;
  /** テキスト系イベントのうち subtype が埋まっている割合。0 なら textNorm 比較に劣化する。 */
  subtypeFilledRatio: number;
  /** meta.measures を持つか。measureAtTick が二分探索に乗れるかどうか。 */
  hasMeasures: boolean;
  /** meta.partGroups の件数。 */
  partGroupCount: number;
  /** 全イベントで type が kind から導出される値と一致するか。 */
  typeMatchesKind: boolean;
  /** measure が 0 のイベント数。小節番号を解決できていないイベントの数。 */
  eventsWithoutMeasure: number;
  /** 索引が events と整合しているか（id の取りこぼし・重複がない）。 */
  indexConsistent: boolean;
}

function typeFromKind(kind: string): string {
  if (kind === CANONICAL.elementKinds.CHORD) return "chord";
  if (kind === CANONICAL.elementKinds.REST) return "rest";
  if (kind === CANONICAL.elementKinds.BAR_LINE) return "barline";
  return "text";
}

function indexIsConsistent(ir: LintIR): boolean {
  const total = ir.events.length;
  const countIds = (map: Record<string, number[]>): number =>
    Object.keys(map).reduce((n, k) => n + map[k].length, 0);

  if (countIds(ir.index.byTick) !== total) return false;
  if (countIds(ir.index.byKind) !== total) return false;
  if (countIds(ir.index.byStaff) !== total) return false;

  let byStaffAndKind = 0;
  for (const staff of Object.keys(ir.index.byStaffAndKind)) {
    byStaffAndKind += countIds(ir.index.byStaffAndKind[staff]);
  }
  return byStaffAndKind === total;
}

export function profileIR(ir: LintIR): IRProfile {
  const kinds = new Set<string>();
  let textual = 0;
  let subtypeFilled = 0;
  let hasGlobalScope = false;
  let typeMatchesKind = true;
  let eventsWithoutMeasure = 0;

  for (const ev of ir.events) {
    kinds.add(ev.kind);
    if (ev.scope === "global") hasGlobalScope = true;
    if (ev.measure === 0) eventsWithoutMeasure++;
    if (ev.type !== typeFromKind(ev.kind)) typeMatchesKind = false;
    if (ev.type === "text") {
      textual++;
      if (ev.subtype !== null && ev.subtype !== undefined) subtypeFilled++;
    }
  }

  return {
    eventCount: ir.events.length,
    kinds: [...kinds].sort(),
    hasGlobalScope,
    subtypeFilledRatio: textual === 0 ? 0 : subtypeFilled / textual,
    hasMeasures: (ir.meta?.measures?.length ?? 0) > 0,
    partGroupCount: ir.meta?.partGroups?.length ?? 0,
    typeMatchesKind,
    eventsWithoutMeasure,
    indexConsistent: indexIsConsistent(ir),
  };
}
