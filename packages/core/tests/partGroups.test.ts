import { describe, expect, it } from "vitest";

import { normalizePartGroups } from "../src/partGroups.js";
import type { PartGroupInfo } from "../src/types.js";

const g = (
  symbol: PartGroupInfo["symbol"],
  startStaffIdx: number,
  staffCount: number,
): PartGroupInfo => ({ symbol, startStaffIdx, staffCount });

describe("normalizePartGroups", () => {
  // 1 譜表しか覆わない括弧はグループとして意味を持たない。
  it("覆う譜表が 2 未満の括弧を落とす", () => {
    expect(normalizePartGroups([g("bracket", 0, 1), g("brace", 3, 0)])).toEqual([]);
  });

  // MuseScore では同じ範囲・同じ種類の括弧が別カラムに重複して現れることがある。
  it("symbol:start:count が同じものを 1 本に畳む", () => {
    expect(normalizePartGroups([g("bracket", 0, 4), g("bracket", 0, 4)])).toEqual([
      g("bracket", 0, 4),
    ]);
  });

  it("種類が違えば別の括弧として残す", () => {
    expect(normalizePartGroups([g("bracket", 0, 4), g("square", 0, 4)])).toHaveLength(2);
  });

  // 入れ子は「同じ譜表を覆う括弧が複数ある」状態で表すので、外側が先に来る必要がある。
  it("開始譜表の昇順、同じなら覆う数の降順に並べる", () => {
    expect(normalizePartGroups([g("brace", 2, 2), g("square", 0, 2), g("bracket", 0, 5)])).toEqual([
      g("bracket", 0, 5),
      g("square", 0, 2),
      g("brace", 2, 2),
    ]);
  });

  it("入力を書き換えない", () => {
    const input = [g("bracket", 0, 4)];
    const out = normalizePartGroups(input);
    out[0].staffCount = 99;
    expect(input[0].staffCount).toBe(4);
  });
});
