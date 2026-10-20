import { describe, expect, it } from "vitest";

import { cleanScore, quintetScore, runAll } from "./helpers.js";

describe("テスト用の最小の楽譜", () => {
  it("どの組み込みルールにも引っかからない", () => {
    expect(runAll(cleanScore())).toEqual([]);
    expect(runAll(quintetScore())).toEqual([]);
  });
});
