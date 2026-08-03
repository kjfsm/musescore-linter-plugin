import type { PartGroupInfo } from "@musescore-linter/core";
import { buildIR } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { bracketGroupKeyOf } from "../../src/base/partGroups.js";

function ir(partGroups: PartGroupInfo[], staffCount = 6) {
  return buildIR({
    parts: Array.from({ length: staffCount }, (_, i) => ({ partName: `P${i}` })),
    partGroups,
  });
}

describe("bracketGroupKeyOf", () => {
  it("該当する括弧が無ければ null を返す（呼び出し側が全体比較へフォールバックする）", () => {
    expect(bracketGroupKeyOf(ir([]), ["bracket"])).toBeNull();
    expect(
      bracketGroupKeyOf(ir([{ symbol: "brace", startStaffIdx: 0, staffCount: 2 }]), ["bracket"]),
    ).toBeNull();
  });

  it("覆う譜表が同じキーになり、外の譜表は null になる", () => {
    const keyOf = bracketGroupKeyOf(ir([{ symbol: "bracket", startStaffIdx: 0, staffCount: 3 }]), [
      "bracket",
    ]);
    expect(keyOf).not.toBeNull();
    expect(keyOf!(0)).toBe(keyOf!(1));
    expect(keyOf!(0)).toBe(keyOf!(2));
    expect(keyOf!(3)).toBeNull();
  });

  it("入れ子では内側（staffCount が小さいほう）が勝つ", () => {
    const keyOf = bracketGroupKeyOf(
      ir([
        { symbol: "bracket", startStaffIdx: 0, staffCount: 4 },
        { symbol: "square", startStaffIdx: 0, staffCount: 2 },
        { symbol: "square", startStaffIdx: 2, staffCount: 2 },
      ]),
      ["bracket", "square"],
    )!;
    expect(keyOf(0)).toBe(keyOf(1));
    expect(keyOf(2)).toBe(keyOf(3));
    expect(keyOf(0)).not.toBe(keyOf(2));
  });

  it("種類を絞ると内側の括弧が無視され、外側の粒度になる", () => {
    const keyOf = bracketGroupKeyOf(
      ir([
        { symbol: "bracket", startStaffIdx: 0, staffCount: 4 },
        { symbol: "square", startStaffIdx: 0, staffCount: 2 },
        { symbol: "square", startStaffIdx: 2, staffCount: 2 },
      ]),
      ["bracket"],
    )!;
    expect(keyOf(0)).toBe(keyOf(3));
  });

  it("1 譜表しか覆わない括弧は候補から外す（外側の括弧を覆い隠して無検出にしないため）", () => {
    const keyOf = bracketGroupKeyOf(
      ir([
        { symbol: "bracket", startStaffIdx: 0, staffCount: 3 },
        { symbol: "square", startStaffIdx: 1, staffCount: 1 },
      ]),
      ["bracket", "square"],
    )!;
    // staff 1 は square(1,1) ではなく外側の bracket に属する
    expect(keyOf(1)).toBe(keyOf(0));
    expect(keyOf(1)).toBe(keyOf(2));
  });
});
