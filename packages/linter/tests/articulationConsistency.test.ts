import type { ChordSpec, PartGroup } from "@score-linter/score-model";
import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { slurTieArticulationConsistency } from "../src/rules/articulationConsistency.js";
import { bracketGroupKeyOf } from "../src/rules/support.js";
import { runRule } from "./helpers.js";

const q = { numerator: 1, denominator: 4 };
const half = { numerator: 1, denominator: 2 };

const names = (...partNames: string[]) => partNames.map((name) => ({ name }));

const run = (score: ReturnType<typeof buildScore>, options?: unknown) =>
  runRule(slurTieArticulationConsistency, score, options);

describe("slur-tie-articulation-consistency", () => {
  it("同リズムで記号が一致していれば検出しない", () => {
    const score = buildScore({
      parts: names("Vn1", "Vn2"),
      chords: [
        { staff: 0, tick: 0, duration: q, articulations: ["Staccato"] },
        { staff: 0, tick: 480, duration: q },
        { staff: 1, tick: 0, duration: q, articulations: ["Staccato"] },
        { staff: 1, tick: 480, duration: q },
      ],
    });
    expect(run(score)).toHaveLength(0);
  });

  it("同リズムでアーティキュレーションが食い違うと info を出す", () => {
    const score = buildScore({
      parts: names("Vn1", "Vn2"),
      chords: [
        { staff: 0, tick: 0, duration: q, articulations: ["Staccato"] },
        { staff: 1, tick: 0, duration: q },
      ],
    });
    const issues = run(score);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.at).toMatchObject({ partId: "P2", staff: 1, measure: 1 });
    expect(issues[0]?.severity).toBe("info");
    expect(issues[0]?.detail).toMatchObject({ comparedToStaffIdx: 0 });
  });

  const twoPlainStaves: ChordSpec[] = [
    { staff: 0, tick: 0, duration: q },
    { staff: 1, tick: 0, duration: q },
  ];

  it("同リズムでスラー被覆が食い違うと検出する", () => {
    const score = buildScore({
      parts: names("Vn1", "Vn2"),
      chords: twoPlainStaves,
      slurs: [{ staff: 0, startTick: 0, endTick: 480 }],
    });
    expect(run(score)).toHaveLength(1);
  });

  it("同リズムでタイ被覆が食い違うと検出する", () => {
    const score = buildScore({
      parts: names("Vn1", "Vn2"),
      chords: twoPlainStaves,
      ties: [{ staff: 0, startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
    });
    expect(run(score)).toHaveLength(1);
  });

  it("同リズムでタイ被覆が一致していれば検出しない", () => {
    const score = buildScore({
      parts: names("Vn1", "Vn2"),
      chords: twoPlainStaves,
      ties: [
        { staff: 0, startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 },
        { staff: 1, startTick: 0, endTick: 480, startPitch: 57, endPitch: 57 },
      ],
    });
    expect(run(score)).toHaveLength(0);
  });

  it("異なるアーティキュレーションなら検出する", () => {
    const score = buildScore({
      parts: names("Vc", "Cb"),
      chords: [
        { staff: 0, tick: 0, duration: q, articulations: ["上スタッカート"] },
        { staff: 1, tick: 0, duration: q, articulations: ["上アクセント"] },
      ],
    });
    expect(run(score)).toHaveLength(1);
  });

  it("リズムが異なるパートは比較しない", () => {
    const score = buildScore({
      parts: names("Vn1", "Vn2"),
      chords: [
        { staff: 0, tick: 0, duration: q, articulations: ["Staccato"] },
        { staff: 1, tick: 0, duration: half },
      ],
    });
    expect(run(score)).toHaveLength(0);
  });

  it("同じ長さでも一方が休符なら同じリズムとみなさない", () => {
    const score = buildScore({
      parts: names("Vn1", "Vn2"),
      chords: [{ staff: 0, tick: 0, duration: q, articulations: ["Staccato"] }],
      rests: [{ staff: 1, tick: 0, duration: q }],
    });
    expect(run(score)).toHaveLength(0);
  });
});

describe("slur-tie-articulation-consistency の比較範囲オプション", () => {
  /**
   * 4 譜表すべてが同じリズムで、staff 0 だけスタッカートが付いている。
   * 全体比較なら staff 1/2/3 の 3 件、括弧で 2 本ずつに割ると staff 1 の 1 件だけになる。
   */
  const fourStaves = (partGroups: PartGroup[]) =>
    buildScore({
      parts: names("Fl1", "Fl2", "Vn1", "Vn2"),
      partGroups,
      chords: [0, 1, 2, 3].map((staff) => ({
        staff,
        tick: 0,
        duration: q,
        ...(staff === 0 ? { articulations: ["Staccato"] } : {}),
      })),
    });

  const pairs: PartGroup[] = [
    { symbol: "square", firstStaff: 0, staffCount: 2 },
    { symbol: "square", firstStaff: 2, staffCount: 2 },
  ];
  const outerBracket: PartGroup = { symbol: "bracket", firstStaff: 0, staffCount: 4 };

  it("既定（scope=all）では括弧があっても全パートを比較する", () => {
    expect(run(fourStaves(pairs))).toHaveLength(3);
  });

  it("scope=group では別の括弧に属するパートを比較しない", () => {
    const issues = run(fourStaves(pairs), { scope: "group" });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.at.staff).toBe(1);
    expect(issues[0]?.detail).toMatchObject({ scope: "group", comparedToStaffIdx: 0 });
  });

  it("入れ子では内側の括弧が優先される", () => {
    expect(run(fourStaves([outerBracket, ...pairs]), { scope: "group" })).toHaveLength(1);
  });

  it("groupSymbols で内側の種類を外すと、外側の括弧の粒度になる", () => {
    const issues = run(fourStaves([outerBracket, ...pairs]), {
      scope: "group",
      groupSymbols: ["bracket"],
    });
    expect(issues).toHaveLength(3);
  });

  it("括弧に属さないパートは比較対象から外れる", () => {
    const partial: PartGroup[] = [{ symbol: "square", firstStaff: 0, staffCount: 2 }];
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

describe("bracketGroupKeyOf", () => {
  const scoreOf = (partGroups: PartGroup[]) =>
    buildScore({ parts: Array.from({ length: 6 }, (_, i) => ({ name: `P${i}` })), partGroups });

  it("該当する括弧が無ければ null を返す（呼び出し側が全体比較へフォールバックする）", () => {
    expect(bracketGroupKeyOf(scoreOf([]), ["bracket"])).toBeNull();
    expect(
      bracketGroupKeyOf(scoreOf([{ symbol: "brace", firstStaff: 0, staffCount: 2 }]), ["bracket"]),
    ).toBeNull();
  });

  it("覆う譜表が同じキーになり、外の譜表は null になる", () => {
    const keyOf = bracketGroupKeyOf(
      scoreOf([{ symbol: "bracket", firstStaff: 0, staffCount: 3 }]),
      ["bracket"],
    );
    expect(keyOf).not.toBeNull();
    expect(keyOf!(0)).toBe(keyOf!(1));
    expect(keyOf!(0)).toBe(keyOf!(2));
    expect(keyOf!(3)).toBeNull();
  });

  const nested: PartGroup[] = [
    { symbol: "bracket", firstStaff: 0, staffCount: 4 },
    { symbol: "square", firstStaff: 0, staffCount: 2 },
    { symbol: "square", firstStaff: 2, staffCount: 2 },
  ];

  it("入れ子では内側（staffCount が小さいほう）が勝つ", () => {
    const keyOf = bracketGroupKeyOf(scoreOf(nested), ["bracket", "square"])!;
    expect(keyOf(0)).toBe(keyOf(1));
    expect(keyOf(2)).toBe(keyOf(3));
    expect(keyOf(0)).not.toBe(keyOf(2));
  });

  it("種類を絞ると内側の括弧が無視され、外側の粒度になる", () => {
    const keyOf = bracketGroupKeyOf(scoreOf(nested), ["bracket"])!;
    expect(keyOf(0)).toBe(keyOf(3));
  });

  it("1 譜表しか覆わない括弧は候補から外す（外側の括弧を覆い隠して無検出にしないため）", () => {
    const keyOf = bracketGroupKeyOf(
      scoreOf([
        { symbol: "bracket", firstStaff: 0, staffCount: 3 },
        { symbol: "square", firstStaff: 1, staffCount: 1 },
      ]),
      ["bracket", "square"],
    )!;
    // staff 1 は square(1,1) ではなく外側の bracket に属する
    expect(keyOf(1)).toBe(keyOf(0));
    expect(keyOf(1)).toBe(keyOf(2));
  });
});
