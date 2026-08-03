import type { PartGroupInfo } from "./types.js";

/**
 * システムブラケットの正規化。入力ソースが違っても `meta.partGroups` の意味が
 * 揃うよう、この 1 箇所で規則を決める。
 *
 * 以前は MuseScore 経路（snapshot.ts の readPartGroups）と MusicXML 経路
 * （partGroups.ts の resolvePartGroups）が同じ規則を別々に実装し、コメントで
 * 互いに「もう片方と揃える」と参照し合っていた。整合性を人の注意力で維持する
 * 設計は必ず壊れる。
 *
 * 規則:
 * - 1 譜表しか覆わない括弧は落とす。グループとして意味を持たないため。
 * - `symbol:start:count` が同じものは 1 本に畳む。MuseScore では同じ範囲・同じ
 *   種類の括弧が別カラムに重複して現れることがある。
 * - 開始譜表の昇順、同じなら覆う譜表数の降順に並べる。入れ子は「同じ譜表を覆う
 *   括弧が複数ある」状態で表すので、外側（覆う数が多いほう）が先に来る。
 */
export function normalizePartGroups(drafts: PartGroupInfo[]): PartGroupInfo[] {
  const out: PartGroupInfo[] = [];
  const seen = new Set<string>();

  for (const draft of drafts) {
    if (draft.staffCount < 2) continue;
    const key = `${draft.symbol}:${draft.startStaffIdx}:${draft.staffCount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...draft });
  }

  return out.sort((a, b) => a.startStaffIdx - b.startStaffIdx || b.staffCount - a.staffCount);
}
