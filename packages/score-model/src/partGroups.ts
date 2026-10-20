import { stableSortBy } from "./sort.js";
import type { PartGroup } from "./types.js";

/**
 * 括弧の並びの約束。どの reader から来た Score でも `partGroups` の意味が揃うよう、
 * {@link createScoreBuilder} がここを通す。
 *
 * - 1 譜表しか覆わない括弧は落とす。比較の相手を生まない。
 * - 同じ種類・同じ範囲の括弧は 1 本に畳む。MuseScore では別カラムに重複して現れることがある。
 * - 開始譜表の昇順、同じなら覆う譜表数の降順。入れ子は外側が先に来る。
 */
export function normalizePartGroups(groups: readonly PartGroup[]): PartGroup[] {
  const out: PartGroup[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    if (group.staffCount < 2) continue;
    const key = `${group.symbol}:${group.firstStaff}:${group.staffCount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...group });
  }
  return stableSortBy(out, (a, b) => a.firstStaff - b.firstStaff || b.staffCount - a.staffCount);
}
