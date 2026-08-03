import { describe, expect, it } from "vitest";

import { toTpc, tpcToAlter, tpcToLetter, tpcToName, tpcToStep } from "../src/pitchSpelling.js";

describe("tpc spelling helpers", () => {
  it("tpcToStep returns 0=C..6=B", () => {
    expect(tpcToStep(14)).toBe(0); // C
    expect(tpcToStep(13)).toBe(3); // F
    expect(tpcToStep(20)).toBe(3); // F#（同じステップ F）
    expect(tpcToStep(19)).toBe(6); // B
  });

  it("tpcToAlter returns the chromatic alteration", () => {
    expect(tpcToAlter(14)).toBe(0); // C
    expect(tpcToAlter(20)).toBe(1); // F#
    expect(tpcToAlter(21)).toBe(1); // C#
    expect(tpcToAlter(12)).toBe(-1); // Bb
  });

  it("tpcToName composes letter + accidental", () => {
    expect(tpcToName(14)).toBe("C");
    expect(tpcToName(13)).toBe("F");
    expect(tpcToName(20)).toBe("F#");
    expect(tpcToName(12)).toBe("Bb");
  });
});

describe("toTpc", () => {
  it("converts step/alter back to the matching TPC", () => {
    expect(toTpc("C", 0)).toBe(14);
    expect(toTpc("F", 1)).toBe(20); // F#
    expect(toTpc("B", -1)).toBe(12); // Bb
  });

  it("未知の step は C（14 相当）として扱う", () => {
    expect(toTpc("H", 0)).toBe(14);
  });
});

describe("tpcToStep / tpcToAlter / toTpc のラウンドトリップ", () => {
  // 有効な TPC は -1（Fbb）〜 33（Bx）の 35 値（変化量 -2..+2 の 5 段 × 文字 7 種）。
  // tpcToAlter(tpc) = floor((tpc + 1) / 7) - 2 が -2..2 に収まる範囲がこれにあたる
  // （tpc = -1 で floor(0/7) - 2 = -2、tpc = 33 で floor(34/7) - 2 = 2）。
  const TPC_MIN = -1;
  const TPC_MAX = 33;

  it("有効な TPC 全域で toTpc(tpcToLetter, tpcToAlter) が元の TPC に戻る", () => {
    for (let tpc = TPC_MIN; tpc <= TPC_MAX; tpc++) {
      expect(toTpc(tpcToLetter(tpc), tpcToAlter(tpc)), `tpc=${tpc}`).toBe(tpc);
    }
  });
});
