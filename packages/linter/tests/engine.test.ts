import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { createLinter, defineRule } from "../src/engine.js";
import { builtinRules } from "../src/rules/index.js";
import type { Rule, Severity } from "../src/types.js";
import { cleanScore, quintetScore, runAll } from "./helpers.js";

const score = buildScore({
  parts: [
    { id: "P1", name: "Vn1" },
    { id: "P2", name: "Vn2" },
  ],
});

/** 譜表 0 に、count 件の指摘を報告するルール。 */
function reporting(id: string, count = 1, overrides: Partial<Rule["meta"]> = {}): Rule {
  return defineRule({
    id,
    meta: {
      name: id,
      description: "",
      category: "notation",
      severity: "warning",
      defaultEnabled: true,
      ...overrides,
    },
    options: {},
    run({ report }) {
      for (let i = 0; i < count; i++) {
        report({ at: { staff: 0, measure: 1, tick: 0 }, message: `issue ${i}` });
      }
    },
  });
}

describe("createLinter", () => {
  it("有効なルールを順に実行し、ルールの順・報告した順に指摘を返す", () => {
    const { issues } = createLinter([reporting("a", 2), reporting("b", 1)]).lint(score);
    expect(issues.map((i) => `${i.ruleId}:${i.message}`)).toEqual([
      "a:issue 0",
      "a:issue 1",
      "b:issue 0",
    ]);
  });

  // 黙って捨てていると、id を打ち間違えたルールが「登録したのに動かない」状態になり気づけない
  it("ルール id が重複したら throw する", () => {
    expect(() => createLinter([reporting("dup"), reporting("dup")])).toThrow(/dup/);
  });

  it("組み込みのルールに id の重複は無い", () => {
    const ids = builtinRules.map((r) => r.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(() => createLinter(builtinRules)).not.toThrow();
  });

  it("指摘にルールの id・category・severity と、譜表からパートを引いた位置が付く", () => {
    const rule = defineRule({
      id: "r",
      meta: {
        name: "r",
        description: "",
        category: "notation",
        severity: "warning",
        defaultEnabled: true,
      },
      options: {},
      run({ report }) {
        report({ at: { staff: 1, measure: 3, tick: 960 }, message: "m", detail: { k: 1 } });
        report({ at: { measure: 1, tick: 0 }, message: "whole" });
      },
    });
    const { issues } = createLinter([rule]).lint(score);
    expect(issues[0]).toEqual({
      ruleId: "r",
      severity: "warning",
      category: "notation",
      message: "m",
      at: { partId: "P2", staff: 1, measure: 3, tick: 960 },
      detail: { k: 1 },
    });
    expect(issues[1]!.at).toEqual({ partId: null, staff: null, measure: 1, tick: 0 });
    expect(issues[1]!.detail).toBeNull();
  });
});

describe("ルールの有効・無効", () => {
  const on = reporting("on");
  const off = reporting("off", 1, { defaultEnabled: false });
  const linter = createLinter([on, off]);

  it("指定が無ければ defaultEnabled に従う", () => {
    expect(linter.isEnabled(on)).toBe(true);
    expect(linter.isEnabled(off)).toBe(false);
    expect(linter.isEnabled(on, { enabled: {} })).toBe(true);
  });

  it("明示指定は defaultEnabled より優先される", () => {
    expect(linter.isEnabled(on, { enabled: { on: false } })).toBe(false);
    expect(linter.isEnabled(off, { enabled: { off: true } })).toBe(true);
  });

  it("他のルールの指定には影響されない", () => {
    expect(linter.isEnabled(on, { enabled: { other: false } })).toBe(true);
  });

  it("無効なルールは実行されない", () => {
    expect(linter.lint(score).issues.map((i) => i.ruleId)).toEqual(["on"]);
    expect(
      linter.lint(score, { enabled: { on: false, off: true } }).issues.map((i) => i.ruleId),
    ).toEqual(["off"]);
  });
});

describe("ルールの例外", () => {
  const bad = defineRule({
    id: "bad",
    meta: {
      name: "bad",
      description: "",
      category: "notation",
      severity: "warning",
      defaultEnabled: true,
    },
    options: {},
    run({ report }) {
      report({ at: { staff: 0, measure: 1, tick: 0 }, message: "途中まで" });
      throw new Error("boom");
    },
  });

  it("例外を投げても他のルールは動き、ruleId internal の指摘になる", () => {
    const { issues } = createLinter([bad, reporting("good")]).lint(score);
    const internal = issues.find((i) => i.ruleId === "internal");
    expect(internal).toMatchObject({ severity: "error", at: { partId: null, staff: null } });
    expect(internal!.message).toContain("bad");
    expect(internal!.message).toContain("boom");
    expect(issues.some((i) => i.ruleId === "good")).toBe(true);
  });

  it("例外を投げたルールが途中まで報告した指摘は残さない", () => {
    const { issues } = createLinter([bad]).lint(score);
    expect(issues.map((i) => i.ruleId)).toEqual(["internal"]);
  });
});

describe("severity の契約", () => {
  function reportingSeverity(meta: Severity, reported: Severity | undefined): Rule {
    return defineRule({
      id: "r",
      meta: {
        name: "r",
        description: "",
        category: "notation",
        severity: meta,
        defaultEnabled: true,
      },
      options: {},
      run({ report }) {
        report({
          at: { staff: 0, measure: 1, tick: 0 },
          message: "m",
          ...(reported ? { severity: reported } : {}),
        });
      },
    });
  }

  it("severity を省略した報告は meta.severity になる", () => {
    const { issues } = createLinter([reportingSeverity("info", undefined)]).lint(score);
    expect(issues[0]!.severity).toBe("info");
  });

  it("meta.severity より軽い報告はそのまま通る", () => {
    const { issues } = createLinter([reportingSeverity("warning", "info")]).lint(score);
    expect(issues[0]).toMatchObject({ ruleId: "r", severity: "info" });
  });

  it.each<[Severity, Severity]>([
    ["info", "warning"],
    ["info", "error"],
    ["warning", "error"],
  ])("meta.severity が %s のルールが %s を報告すると内部エラーになる", (meta, reported) => {
    const { issues } = createLinter([reportingSeverity(meta, reported)]).lint(score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ ruleId: "internal", severity: "error" });
  });
});

describe("オプションの受け渡し", () => {
  function optionProbe(id: string, seen: Record<string, unknown>): Rule {
    return defineRule({
      id,
      meta: {
        name: id,
        description: "",
        category: "notation",
        severity: "info",
        defaultEnabled: true,
      },
      options: {
        scope: {
          label: "範囲",
          type: "select",
          choices: [
            { value: "all", label: "全部" },
            { value: "group", label: "グループ" },
          ],
          default: "all",
        },
        strict: { label: "厳格", type: "boolean", default: false },
      },
      run({ options }) {
        seen[id] = options;
      },
    });
  }

  it("宣言に沿って正規化し、対応するルールにだけ渡す", () => {
    const seen: Record<string, unknown> = {};
    createLinter([optionProbe("a", seen), optionProbe("b", seen)]).lint(score, {
      options: { a: { scope: "group", unknown: 1, strict: "yes" } },
    });
    expect(seen.a).toEqual({ scope: "group", strict: false });
    expect(seen.b).toEqual({ scope: "all", strict: false });
  });

  it("オプションを省略しても既定値で動く", () => {
    const seen: Record<string, unknown> = {};
    createLinter([optionProbe("a", seen)]).lint(score);
    expect(seen.a).toEqual({ scope: "all", strict: false });
  });
});

describe("実行時間の計測", () => {
  function fakeClock(...values: number[]) {
    let i = 0;
    return () => values[i++]!;
  }

  it("時計を渡すと、実行したルールごとの所要時間が実行順に入る", () => {
    const linter = createLinter(
      [reporting("a"), reporting("skipped", 1, { defaultEnabled: false }), reporting("b")],
      {
        now: fakeClock(10, 15, 20, 50),
      },
    );
    expect(linter.lint(score).timings).toEqual([
      { ruleId: "a", ms: 5 },
      { ruleId: "b", ms: 30 },
    ]);
  });

  it("例外を投げたルールの時間も記録する", () => {
    const bad = defineRule({
      id: "bad",
      meta: {
        name: "bad",
        description: "",
        category: "notation",
        severity: "info",
        defaultEnabled: true,
      },
      options: {},
      run() {
        throw new Error("boom");
      },
    });
    const { timings } = createLinter([bad], { now: fakeClock(0, 7) }).lint(score);
    expect(timings).toEqual([{ ruleId: "bad", ms: 7 }]);
  });

  // QML のエンジンには performance.now() が無いので、時計が無い環境でも動かなければならない
  it("時計を渡さなければ timings は空", () => {
    expect(createLinter([reporting("a")]).lint(score).timings).toEqual([]);
  });
});

describe("グローバルな状態を持たない", () => {
  it("別々に作ったリンターは互いのルールにも結果にも影響しない", () => {
    const a = createLinter([reporting("a")]);
    const b = createLinter([reporting("b", 2)]);
    expect(a.lint(score).issues.map((i) => i.ruleId)).toEqual(["a"]);
    expect(b.lint(score).issues.map((i) => i.ruleId)).toEqual(["b", "b"]);
    expect(a.rules.map((r) => r.id)).toEqual(["a"]);
  });

  // 重複 id の検査が登録表のような共有状態に残ると、同じ組み合わせを 2 回作れなくなる
  it("同じルールの組み合わせを何度作っても throw しない", () => {
    const rules = [reporting("a")];
    expect(() => {
      createLinter(rules);
      createLinter(rules);
    }).not.toThrow();
  });

  it("lint を繰り返しても結果は変わらない", () => {
    const linter = createLinter([reporting("a", 2)]);
    expect(linter.lint(score).issues).toEqual(linter.lint(score).issues);
  });
});

describe("組み込みルールの実行", () => {
  it("無効にしたルールは実行されない", () => {
    const noTempo = buildScore({
      parts: [{ name: "Vn1" }],
      chords: [{ tick: 0 }],
    });
    expect(runAll(noTempo).some((i) => i.ruleId === "opening-tempo")).toBe(true);

    const issues = runAll(noTempo, { "opening-tempo": false, "first-note-dynamics": false });
    expect(issues.filter((i) => i.ruleId === "opening-tempo")).toEqual([]);
    expect(issues.filter((i) => i.ruleId === "first-note-dynamics")).toEqual([]);
  });

  it("複数のルールを無効にしても、他のルールは動く", () => {
    const withPizz = cleanScore({
      annotations: [{ staff: 0, measure: 2, tick: 480, text: "pizz." }],
    });
    const issues = runAll(withPizz, { "opening-tempo": false, "first-note-dynamics": false });
    expect(issues.filter((i) => i.ruleId === "pizz-arco")).toHaveLength(1);
  });
});

describe("テスト用の楽譜 quintetScore", () => {
  it("Vn1/Vn2/Va/Vc/Cb の 5 パートを持つ", () => {
    expect(quintetScore().parts.map((p) => p.name)).toEqual(["Vn1", "Vn2", "Va", "Vc", "Cb"]);
  });

  it("どの組み込みルールにも引っかからない", () => {
    expect(runAll(quintetScore())).toEqual([]);
  });
});
