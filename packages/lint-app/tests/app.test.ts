import { defineRule, type Rule, type RuleMeta } from "@score-linter/linter";
import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { createLintApp } from "../src/app.js";

const score = buildScore({
  parts: [{ id: "p1", name: "Horn" }],
  measures: [{ label: "0", ticks: 480 }, { label: "1" }, { label: "2" }],
});

const OPTIONS = {
  scope: {
    label: "範囲",
    type: "select",
    choices: [
      { value: "all", label: "全部" },
      { value: "group", label: "括弧" },
    ],
    default: "all",
  },
  symbols: {
    label: "括弧",
    type: "multiselect",
    choices: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
    default: ["a"],
  },
} as const;

function rule(id: string, meta: Partial<RuleMeta> = {}, measure = 1): Rule {
  return defineRule({
    id,
    meta: {
      name: id,
      description: "",
      category: "notation",
      severity: "info",
      defaultEnabled: true,
      ...meta,
    },
    options: OPTIONS,
    run({ options, report }) {
      report({
        at: { staff: 0, measure, tick: 0 },
        message: `${options.scope}:${options.symbols.join(",")}`,
      });
    },
  });
}

const rules = [rule("on", { severity: "warning" }, 2), rule("off", { defaultEnabled: false })];
const NO_SETTINGS = { enabled: {}, options: {} };

describe("createLintApp の lint", () => {
  it("既定で有効なルールだけを走らせ、オプションの既定値を渡す", () => {
    const { issues } = createLintApp(rules).lint(score, NO_SETTINGS);
    expect(issues.map((i) => [i.ruleId, i.message])).toEqual([["on", "all:a"]]);
  });

  it("設定の ON/OFF とオプションの値がルールに届く", () => {
    const app = createLintApp(rules);
    let settings = app.withRuleEnabled(NO_SETTINGS, "on", false);
    settings = app.withRuleEnabled(settings, "off", true);
    settings = app.withRuleOption(settings, "off", "symbols", ["b", "a"]);
    const { issues } = app.lint(score, settings);
    expect(issues.map((i) => [i.ruleId, i.message])).toEqual([["off", "all:a,b"]]);
  });

  it("表示用に並べ替え、severity ごとに数える", () => {
    const app = createLintApp(rules);
    const result = app.lint(score, app.withRuleEnabled(NO_SETTINGS, "off", true));
    expect(result.issues.map((i) => [i.ruleId, i.measureLabel])).toEqual([
      ["off", "0"],
      ["on", "1"],
    ]);
    expect(result.counts).toEqual({ error: 0, warning: 1, info: 1 });
  });

  it("ホストの警告を warning の内部の指摘にして、同じ並びと件数に入れる", () => {
    const { issues, counts } = createLintApp(rules).lint(score, NO_SETTINGS, {
      diagnostics: [
        { id: "host-unread", message: "読めなかった", measure: 2 },
        { id: "host-version", message: "版が違う", measure: 0 },
      ],
    });
    expect(issues.map((i) => i.ruleId)).toEqual(["host-version", "host-unread", "on"]);
    expect(issues[0]).toMatchObject({
      severity: "warning",
      category: "internal",
      message: "版が違う",
      partId: null,
      staffIdx: -1,
      measureLabel: "",
    });
    expect(issues[1]).toMatchObject({ measure: 2, measureLabel: "1" });
    expect(counts.warning).toBe(3);
  });

  it("時計を渡したときだけ、走らせたルールの時間を返す", () => {
    const app = createLintApp(rules);
    expect(app.lint(score, NO_SETTINGS).timings).toEqual([]);
    let t = 0;
    const { timings } = app.lint(score, NO_SETTINGS, { now: () => (t += 5) });
    expect(timings).toEqual([{ ruleId: "on", ms: 5 }]);
  });
});

describe("createLintApp の設定", () => {
  it("保存値の読み書きが往復し、既定値と同じ値は残さない", () => {
    const app = createLintApp(rules);
    let settings = app.withRuleEnabled(NO_SETTINGS, "on", false);
    settings = app.withRuleEnabled(settings, "off", false);
    settings = app.withRuleOption(settings, "on", "scope", "group");
    settings = app.withRuleOption(settings, "on", "symbols", ["a"]);
    const saved = app.serializeSettings(settings);
    expect(saved).toEqual({ enabled: '{"on":false}', options: '{"on":{"scope":"group"}}' });
    expect(app.parseSettings(saved.enabled, saved.options)).toEqual(settings);
  });

  it("変えた値を元に戻すと保存から消える", () => {
    const app = createLintApp(rules);
    const settings = app.withRuleEnabled(app.withRuleEnabled(NO_SETTINGS, "on", false), "on", true);
    expect(settings.enabled).toEqual({});
  });

  it("全値で保存した旧版の値も、既定と違う分だけ残して読む", () => {
    const settings = createLintApp(rules).parseSettings(
      '{"on":true,"off":true}',
      '{"on":{"scope":"all","symbols":["b","a"]}}',
    );
    expect(settings).toEqual({ enabled: { off: true }, options: { on: { symbols: ["a", "b"] } } });
  });

  it("未知のルール・キー・型の合わない値・壊れた JSON は捨てる", () => {
    const app = createLintApp(rules);
    expect(app.parseSettings('{"gone":false,"on":"no"}', '{"on":{"scope":"x","nope":1}}')).toEqual(
      NO_SETTINGS,
    );
    expect(app.parseSettings("{", "[1,2]")).toEqual(NO_SETTINGS);
  });

  it("生の値を、既定値との差分だけの設定に正規化する", () => {
    const settings = createLintApp(rules).normalizeSettings({
      enabled: { on: true, off: true },
      options: { on: { scope: "all", symbols: ["b", "a"] } },
    });
    expect(settings).toEqual({ enabled: { off: true }, options: { on: { symbols: ["a", "b"] } } });
  });

  it("保存したあとで既定値が変わったら、変えていないルールには新しい既定値が効く", () => {
    const saved = createLintApp(rules).serializeSettings({ enabled: { on: false }, options: {} });
    const changed = createLintApp([rule("on"), rule("off")]);
    const view = changed.settingsView(changed.parseSettings(saved.enabled, saved.options));
    expect(view.enabled).toEqual({ on: false, off: true });
  });

  it("設定画面に出す値は、どのルールも既定値で埋める", () => {
    const app = createLintApp(rules);
    const view = app.settingsView(app.withRuleOption(NO_SETTINGS, "on", "scope", "group"));
    expect(view).toEqual({
      enabled: { on: true, off: false },
      options: { on: { scope: "group", symbols: ["a"] }, off: { scope: "all", symbols: ["a"] } },
    });
  });
});

describe("createLintApp のカタログ", () => {
  it("カテゴリを決まった順に並べ、ルールの無いカテゴリは出さない", () => {
    const { catalog } = createLintApp([
      rule("n", { category: "notation" }),
      rule("t", { category: "tempo" }),
      rule("s", { category: "slur-tie" }),
    ]);
    expect(catalog.map((g) => [g.category, g.label])).toEqual([
      ["tempo", "テンポ"],
      ["slur-tie", "スラー・タイ"],
      ["notation", "記譜"],
    ]);
  });

  it("カテゴリの中は重い順、同じ重さならルールの並びのまま", () => {
    const [group] = createLintApp([
      rule("i1"),
      rule("e", { severity: "error" }),
      rule("i2"),
    ]).catalog;
    expect(group!.rules.map((r) => r.id)).toEqual(["e", "i1", "i2"]);
    expect(group!.rules[0]!.options.map((o) => o.key)).toEqual(["scope", "symbols"]);
  });
});
