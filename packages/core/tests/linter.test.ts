import { describe, it, expect, beforeEach } from "vitest";
import { reset, register } from "../src/checkerRegistry.js";
import { runAllCheckers, ensureDerived } from "../src/linter.js";
import type { Checker, LintIR } from "../src/types.js";
import { CANONICAL } from "../src/enumRegistry.js";

function minimalIR(): LintIR {
  return {
    events: [],
    index: { byStaff: {}, byTick: {}, byKind: {}, byStaffAndKind: {} },
    meta: { parts: [], firstMusicTickByStaff: [], lastTick: 0 },
    registry: { canonical: CANONICAL },
    derived: null,
  };
}

function mockChecker(id: string, issues = 0): Checker {
  return {
    id,
    name: id,
    description: "",
    category: "test",
    severity: "warning",
    defaultEnabled: true,
    run: () =>
      Array.from({ length: issues }, (_, i) => ({
        ruleId: id,
        severity: "warning" as const,
        category: "test",
        message: `issue ${i}`,
        partName: "",
        staffIdx: -1,
        measure: 1,
        tick: 0,
        detail: null,
      })),
  };
}

describe("runAllCheckers", () => {
  beforeEach(() => reset());

  it("登録された checker を実行し issue を返す", () => {
    register(mockChecker("a", 2));
    register(mockChecker("b", 1));
    const issues = runAllCheckers(minimalIR());
    expect(issues).toHaveLength(3);
  });

  it("enabledRules で無効化できる", () => {
    register(mockChecker("a", 2));
    const issues = runAllCheckers(minimalIR(), { a: false });
    expect(issues).toHaveLength(0);
  });

  it("checker が例外を投げても他の checker は動く", () => {
    register({
      ...mockChecker("bad"),
      run() { throw new Error("boom"); },
    });
    register(mockChecker("good", 1));
    const issues = runAllCheckers(minimalIR());
    expect(issues.some((i) => i.ruleId === "internal")).toBe(true);
    expect(issues.some((i) => i.ruleId === "good")).toBe(true);
  });
});

describe("ensureDerived", () => {
  it("firstChordByStaff を計算する", () => {
    const ir = minimalIR();
    ir.events.push({
      id: 0, tick: 480, measure: 2, staffIdx: 0, voice: 0,
      kind: CANONICAL.elementKinds.CHORD, type: "chord",
      textNorm: "", textRaw: "", scope: "staff", subtype: null, subStyle: null, tempo: null,
    });
    ir.index.byKind[CANONICAL.elementKinds.CHORD] = [0];
    ensureDerived(ir);
    expect(ir.derived?.firstChordByStaff[0]).toEqual({ tick: 480, measure: 2 });
  });

  it("キャッシュが有効なら再計算しない", () => {
    const ir = minimalIR();
    ensureDerived(ir);
    const derived1 = ir.derived;
    ensureDerived(ir);
    expect(ir.derived).toBe(derived1);
  });
});
