import { ensureDerived, type LintIR } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { slurTieArticulationConsistencyChecker } from "../src/slurTieArticulationConsistencyChecker.js";
import { buildIR, K } from "./helpers/irBuilder.js";

const run = (ir: LintIR, options?: Record<string, unknown>) => {
  ensureDerived(ir);
  return slurTieArticulationConsistencyChecker.run(ir, options);
};

const q = { numerator: 1, denominator: 4 };

describe("slur-tie-articulation-consistency", () => {
  it("同リズムで記号が一致していれば検出しない", () => {
    const ir = buildIR({
      parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
      events: [
        {
          kind: K.CHORD,
          staff: 0,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
          articulations: ["Staccato"],
        },
        {
          kind: K.CHORD,
          staff: 0,
          voice: 0,
          tick: 480,
          measure: 1,
          duration: q,
        },
        {
          kind: K.CHORD,
          staff: 1,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
          articulations: ["Staccato"],
        },
        {
          kind: K.CHORD,
          staff: 1,
          voice: 0,
          tick: 480,
          measure: 1,
          duration: q,
        },
      ],
    });
    expect(run(ir)).toHaveLength(0);
  });

  it("同リズムでアーティキュレーションが食い違うと info を出す", () => {
    const ir = buildIR({
      parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
      events: [
        {
          kind: K.CHORD,
          staff: 0,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
          articulations: ["Staccato"],
        },
        { kind: K.CHORD, staff: 1, voice: 0, tick: 0, measure: 1, duration: q },
      ],
    });
    const issues = run(ir);
    expect(issues).toHaveLength(1);
    const [issue] = issues;
    expect(issue?.staffIdx).toBe(1);
    expect(issue?.severity).toBe("info");
  });

  it("同リズムでスラー被覆が食い違うと検出する", () => {
    const ir = buildIR({
      parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
      events: [
        { kind: K.CHORD, staff: 0, voice: 0, tick: 0, measure: 1, duration: q },
        { kind: K.CHORD, staff: 1, voice: 0, tick: 0, measure: 1, duration: q },
      ],
      slurs: [{ staffIdx: 0, voice: 0, startTick: 0, endTick: 480 }],
    });
    expect(run(ir)).toHaveLength(1);
  });

  it("同リズムでタイ被覆が食い違うと検出する", () => {
    const ir = buildIR({
      parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
      events: [
        { kind: K.CHORD, staff: 0, voice: 0, tick: 0, measure: 1, duration: q },
        { kind: K.CHORD, staff: 1, voice: 0, tick: 0, measure: 1, duration: q },
      ],
      ties: [
        {
          staffIdx: 0,
          voice: 0,
          startTick: 0,
          endTick: 480,
          startPitch: 60,
          endPitch: 60,
        },
      ],
    });
    expect(run(ir)).toHaveLength(1);
  });

  it("同リズムでタイ被覆が一致していれば検出しない", () => {
    const ir = buildIR({
      parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
      events: [
        { kind: K.CHORD, staff: 0, voice: 0, tick: 0, measure: 1, duration: q },
        { kind: K.CHORD, staff: 1, voice: 0, tick: 0, measure: 1, duration: q },
      ],
      ties: [
        {
          staffIdx: 0,
          voice: 0,
          startTick: 0,
          endTick: 480,
          startPitch: 60,
          endPitch: 60,
        },
        {
          staffIdx: 1,
          voice: 0,
          startTick: 0,
          endTick: 480,
          startPitch: 57,
          endPitch: 57,
        },
      ],
    });
    expect(run(ir)).toHaveLength(0);
  });

  it("上/下スタッカートなど配置違いは同一視して検出しない", () => {
    const ir = buildIR({
      parts: [{ partName: "Vc" }, { partName: "Cb" }],
      events: [
        {
          kind: K.CHORD,
          staff: 0,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
          articulations: ["上スタッカート"],
        },
        {
          kind: K.CHORD,
          staff: 1,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
          articulations: ["下スタッカート"],
        },
      ],
    });
    expect(run(ir)).toHaveLength(0);
  });

  it("正規化しても異なるアーティキュレーションなら検出する", () => {
    const ir = buildIR({
      parts: [{ partName: "Vc" }, { partName: "Cb" }],
      events: [
        {
          kind: K.CHORD,
          staff: 0,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
          articulations: ["上スタッカート"],
        },
        {
          kind: K.CHORD,
          staff: 1,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
          articulations: ["上アクセント"],
        },
      ],
    });
    expect(run(ir)).toHaveLength(1);
  });

  it("リズムが異なるパートは比較しない", () => {
    const ir = buildIR({
      parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
      events: [
        {
          kind: K.CHORD,
          staff: 0,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
          articulations: ["Staccato"],
        },
        {
          kind: K.CHORD,
          staff: 1,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: { numerator: 1, denominator: 2 },
        },
      ],
    });
    expect(run(ir)).toHaveLength(0);
  });

  it("同じ長さでも一方が休符なら同じリズムとみなさない", () => {
    const ir = buildIR({
      parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
      events: [
        {
          kind: K.CHORD,
          staff: 0,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
          articulations: ["Staccato"],
        },
        {
          kind: K.REST,
          staff: 1,
          voice: 0,
          tick: 0,
          measure: 1,
          duration: q,
        },
      ],
    });
    expect(run(ir)).toHaveLength(0);
  });
});

describe("slur-tie-articulation-consistency の比較範囲オプション", () => {
  /**
   * 4 譜表すべてが同じリズムで、staff 0 だけスタッカートが付いている。
   * 全体比較なら staff 1/2/3 の 3 件、括弧で 2 本ずつに割ると staff 1 の 1 件だけになる。
   */
  const fourStaves = (partGroups: Parameters<typeof buildIR>[0]["partGroups"]) =>
    buildIR({
      parts: [{ partName: "Fl1" }, { partName: "Fl2" }, { partName: "Vn1" }, { partName: "Vn2" }],
      partGroups,
      events: [0, 1, 2, 3].map((staff) => ({
        kind: K.CHORD,
        staff,
        voice: 0,
        tick: 0,
        measure: 1,
        duration: q,
        ...(staff === 0 ? { articulations: ["Staccato"] } : {}),
      })),
    });

  const pairs = [
    { symbol: "square" as const, startStaffIdx: 0, staffCount: 2 },
    { symbol: "square" as const, startStaffIdx: 2, staffCount: 2 },
  ];

  it("既定（scope=all）では括弧があっても全パートを比較する", () => {
    expect(run(fourStaves(pairs))).toHaveLength(3);
  });

  it("scope=group では別の括弧に属するパートを比較しない", () => {
    const issues = run(fourStaves(pairs), { scope: "group" });
    expect(issues).toHaveLength(1);
    expect(issues[0].staffIdx).toBe(1);
    expect(issues[0].detail).toMatchObject({ scope: "group", comparedToStaffIdx: 0 });
  });

  it("入れ子では内側の括弧が優先される", () => {
    const nested = [{ symbol: "bracket" as const, startStaffIdx: 0, staffCount: 4 }, ...pairs];
    expect(run(fourStaves(nested), { scope: "group" })).toHaveLength(1);
  });

  it("groupSymbols で内側の種類を外すと、外側の括弧の粒度になる", () => {
    const nested = [{ symbol: "bracket" as const, startStaffIdx: 0, staffCount: 4 }, ...pairs];
    expect(run(fourStaves(nested), { scope: "group", groupSymbols: ["bracket"] })).toHaveLength(3);
  });

  it("括弧に属さないパートは比較対象から外れる", () => {
    const partial = [{ symbol: "square" as const, startStaffIdx: 0, staffCount: 2 }];
    // staff 2/3 はどの括弧にも属さないので、検出は staff 1 の 1 件だけ
    expect(run(fourStaves(partial), { scope: "group" })).toHaveLength(1);
  });

  it("該当する種類の括弧が無ければ全パート比較にフォールバックする", () => {
    expect(run(fourStaves([]), { scope: "group" })).toHaveLength(3);
    expect(run(fourStaves(pairs), { scope: "group", groupSymbols: ["brace"] })).toHaveLength(3);
  });

  it("不正なオプション値は既定に落とす", () => {
    expect(run(fourStaves(pairs), { scope: "nonsense" })).toHaveLength(3);
    expect(run(fourStaves(pairs), { scope: "group", groupSymbols: "square" })).toHaveLength(1);
  });
});
