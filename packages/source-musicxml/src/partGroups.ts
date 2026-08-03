import type { PartGroupInfo, PartGroupSymbol } from "@musescore-linter/core";

import type { XNode } from "./xml.js";
import { attr, childText, childrenOf, tagOf } from "./xml.js";

/** `<part-list>` 上での 1 グループ。staffIdx はこの時点では解決できない。 */
export interface PartGroupDraft {
  symbol: PartGroupSymbol;
  memberIds: string[];
}

/** その `<part>` が占める譜表の範囲。 */
export interface StaffRange {
  start: number;
  count: number;
}

// `group-symbol` は XML 由来の任意文字列なので、素のオブジェクトで引くと `constructor` や
// `toString` が prototype 経由で truthy になり、関数が symbol に紛れ込む。Map で引く。
const SUPPORTED = new Map<string, PartGroupSymbol>([
  ["bracket", "bracket"],
  ["square", "square"],
  ["brace", "brace"],
  ["line", "line"],
]);

interface OpenGroup {
  symbol: string;
  memberIds: string[];
}

/**
 * `<part-list>` を文書順に 1 パスして、開いている括弧に `<score-part>` を積む。
 *
 * `childrenNamed` ではなく `childrenOf` を使うのは、`<part-group>` と `<score-part>` の
 * **出現順**が対応関係そのものだから（順序が落ちるとどの part がどの括弧に入るか決まらない）。
 *
 * `number` 属性は入れ子の深さではなく「開いた括弧を閉じるための識別子」で、閉じたあとに
 * 同じ番号が再利用される。そのため深さではなく number をキーにしたマップで管理する。
 */
export function readPartGroupDrafts(partList: XNode | undefined): PartGroupDraft[] {
  const drafts: PartGroupDraft[] = [];
  if (!partList) return drafts;

  // 挿入順を保つので、閉じ忘れの回収も文書順になる
  const open = new Map<string, OpenGroup>();

  const close = (group: OpenGroup): void => {
    const symbol = SUPPORTED.get(group.symbol);
    // group-symbol 省略時の既定は "none"。括弧として描かれないので採らない。
    // ただしスタック管理には参加させている（させないと入れ子の対応が崩れる）。
    if (!symbol || group.memberIds.length === 0) return;
    drafts.push({ symbol, memberIds: group.memberIds });
  };

  for (const node of childrenOf(partList)) {
    const tag = tagOf(node);

    if (tag === "score-part") {
      const id = attr(node, "id");
      if (!id) continue;
      for (const group of open.values()) group.memberIds.push(id);
      continue;
    }

    if (tag !== "part-group") continue;

    const number = attr(node, "number") ?? "1";
    const type = attr(node, "type");

    if (type === "start") {
      open.set(number, { symbol: childText(node, "group-symbol") ?? "none", memberIds: [] });
    } else if (type === "stop") {
      const group = open.get(number);
      // 対応する start が無い stop は壊れた入力。無視する。
      if (!group) continue;
      open.delete(number);
      close(group);
    }
  }

  // 閉じ忘れたまま part-list が終わったグループも拾う（寛容側に倒す）
  for (const group of open.values()) close(group);

  return drafts;
}

/**
 * draft の partId を staffIdx の範囲へ解決する。
 *
 * staffIdx の採番は `<part-list>` の順ではなく `<part>` 要素の出現順なので、
 * 解決は `<part>` を全部走査したあとでしか行えない。
 */
export function resolvePartGroups(
  drafts: PartGroupDraft[],
  rangeByPartId: Map<string, StaffRange>,
): PartGroupInfo[] {
  const out: PartGroupInfo[] = [];
  const seen = new Set<string>();

  for (const draft of drafts) {
    // <score-part> はあるが <part> が無い id は捨てる
    const ranges = draft.memberIds
      .map((id) => rangeByPartId.get(id))
      .filter((r): r is StaffRange => r !== undefined);
    if (ranges.length === 0) continue;

    const startStaffIdx = Math.min(...ranges.map((r) => r.start));
    const end = Math.max(...ranges.map((r) => r.start + r.count));
    const staffCount = end - startStaffIdx;

    // PartGroupInfo は連続した範囲しか表せない。`<part-list>` の順と `<part>` の順が
    // ズレて飛び地になった場合は、嘘の範囲を作るより捨てるほうが正直。
    const covered = ranges.reduce((n, r) => n + r.count, 0);
    if (covered !== staffCount) continue;

    // 1 譜表しか覆わない括弧はグループとして意味を持たない。MuseScore 経路
    // （snapshot.ts の readPartGroups）も同じ条件で落としており、meta.partGroups の
    // 意味を両ソースで揃えるためここでも落とす。
    if (staffCount < 2) continue;

    const key = `${draft.symbol}:${startStaffIdx}:${staffCount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ symbol: draft.symbol, startStaffIdx, staffCount });
  }

  // 外側の括弧が先に来る並び（MuseScore 経路と揃える）
  return out.sort((a, b) => a.startStaffIdx - b.startStaffIdx || b.staffCount - a.staffCount);
}
