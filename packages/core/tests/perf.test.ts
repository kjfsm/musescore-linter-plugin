import { afterEach, describe, expect, it } from "vitest";

import { createPerf, isPerfEnabled, setPerfEnabled } from "../src/perf.js";

afterEach(() => {
  setPerfEnabled(false);
});

describe("setPerfEnabled / isPerfEnabled", () => {
  it("既定では無効", () => {
    expect(isPerfEnabled()).toBe(false);
  });

  it("切り替えられる", () => {
    setPerfEnabled(true);
    expect(isPerfEnabled()).toBe(true);
    setPerfEnabled(false);
    expect(isPerfEnabled()).toBe(false);
  });
});

describe("無効時", () => {
  it("now() は 0 を返す", () => {
    const perf = createPerf("t");
    expect(perf.now()).toBe(0);
  });

  it("記録しても report() は空文字列", () => {
    const perf = createPerf("t");
    perf.addSince("a", perf.now());
    perf.add("b", 42);
    perf.count("c", 7);
    expect(perf.report()).toBe("");
  });

  it("有効化しても、無効中に積んだ分は残っていない", () => {
    const perf = createPerf("t");
    perf.add("a", 42);
    setPerfEnabled(true);
    expect(perf.report()).toBe("");
  });
});

describe("有効時", () => {
  it("add() は同じラベルに加算する", () => {
    setPerfEnabled(true);
    const perf = createPerf("snapshot");
    perf.add("annotations", 10);
    perf.add("annotations", 5);
    expect(perf.report()).toContain("annotations  15 ms");
  });

  it("count() は既定で 1 ずつ、指定があればその数だけ加算する", () => {
    setPerfEnabled(true);
    const perf = createPerf("snapshot");
    perf.count("segments");
    perf.count("segments");
    perf.count("events", 100);
    const report = perf.report();
    expect(report).toContain("segments    2 回");
    expect(report).toContain("events    100 回");
  });

  it("addSince() は now() からの経過を加算する", () => {
    setPerfEnabled(true);
    const perf = createPerf("snapshot");
    const t0 = perf.now();
    expect(t0).toBeGreaterThan(0);
    perf.addSince("total", t0);
    expect(perf.report()).toMatch(/total\s+\d+ ms/);
  });

  it("report() の先頭にタグが付き、時間と回数が区切られる", () => {
    setPerfEnabled(true);
    const perf = createPerf("snapshot");
    perf.add("total", 300);
    perf.count("measures", 502);
    const lines = perf.report().split("\n");
    expect(lines[0]).toBe("[ScoreLinter:snapshot]");
    expect(lines).toContain("  ---");
    expect(lines[1]).toContain("300 ms");
    expect(lines[lines.length - 1]).toContain("502 回");
  });

  it("時間だけ・回数だけのときは区切り線を出さない", () => {
    setPerfEnabled(true);
    const perf = createPerf("t");
    perf.add("total", 1);
    expect(perf.report()).not.toContain("---");
  });

  it("記録が無ければ空文字列", () => {
    setPerfEnabled(true);
    expect(createPerf("t").report()).toBe("");
  });

  it("clear() で記録を捨てる", () => {
    setPerfEnabled(true);
    const perf = createPerf("t");
    perf.add("a", 1);
    perf.count("b", 1);
    perf.clear();
    expect(perf.report()).toBe("");
  });

  it("複数ラベルの桁を揃える", () => {
    setPerfEnabled(true);
    const perf = createPerf("t");
    perf.add("a", 5);
    perf.add("longLabel", 1000);
    const lines = perf.report().split("\n");
    // ラベル幅・数値幅ともに右端が揃う
    expect(lines[1]).toBe("  a             5 ms");
    expect(lines[2]).toBe("  longLabel  1000 ms");
  });
});
