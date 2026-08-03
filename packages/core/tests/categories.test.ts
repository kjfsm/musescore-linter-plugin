import { beforeEach, describe, expect, it } from "vitest";

import { categoryLabel, getCategories } from "../src/categories.js";
import { register, reset } from "../src/checkerRegistry.js";
import type { Checker } from "../src/types.js";

function checkerIn(category: string, id = category): Checker {
  return {
    id,
    name: id,
    description: "",
    category,
    severity: "warning",
    defaultEnabled: true,
    run: () => [],
  };
}

describe("getCategories", () => {
  beforeEach(() => reset());

  it("checker が存在するカテゴリだけを返す", () => {
    register(checkerIn("tempo"));
    register(checkerIn("notation"));
    expect(getCategories().map((c) => c.id)).toEqual(["tempo", "notation"]);
  });

  it("既知の並び順に従う", () => {
    for (const c of ["notation", "slur-tie", "tempo", "articulation", "dynamics"]) {
      register(checkerIn(c));
    }
    expect(getCategories().map((c) => c.id)).toEqual([
      "tempo",
      "dynamics",
      "articulation",
      "slur-tie",
      "notation",
    ]);
  });

  // 並び順の配列を UI 側で持っていた頃、配列に足し忘れたカテゴリの checker は
  // 設定タブから丸ごと消えていた（slur-tie を追加したときに実際に起きた）。
  it("未知のカテゴリも落とさず末尾に回す", () => {
    register(checkerIn("tempo"));
    register(checkerIn("brand-new"));
    const ids = getCategories().map((c) => c.id);
    expect(ids).toEqual(["tempo", "brand-new"]);
  });

  it("未知のカテゴリのラベルは id をそのまま使う", () => {
    expect(categoryLabel("brand-new")).toBe("brand-new");
    expect(categoryLabel("slur-tie")).toBe("スラー・タイ");
  });
});
