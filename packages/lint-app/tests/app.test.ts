import { defineRule, type Rule, type RuleMeta } from "@score-linter/linter";
import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { createLintApp } from "../src/app.ts";
import type { Settings } from "../src/settings.ts";

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
      tier: "recommended",
      ...meta,
    },
    options: OPTIONS,
    messages: { seen: "{scope}:{symbols}" },
    run({ options, report }) {
      report({
        at: { staff: 0, measure, tick: 0 },
        messageId: "seen",
        data: { scope: options.scope, symbols: options.symbols.join(",") },
      });
    },
  });
}

const rules = [rule("on", { severity: "warning" }, 2), rule("off", { tier: "nursery" })];
const NO_SETTINGS: Settings = { preset: "recommended", enabled: {}, options: {} };

const tiered = [
  rule("rec", { category: "dynamics" }),
  rule("ped", { category: "dynamics", tier: "pedantic" }),
  rule("nur", { category: "dynamics", tier: "nursery" }),
  rule("other", { category: "tempo", tier: "pedantic" }),
];
const ran = (app: ReturnType<typeof createLintApp>, settings: Settings) =>
  app
    .lint(score, settings)
    .issues.map((i) => i.ruleId)
    .sort();

describe("createLintApp の lint", () => {
  it("既定で有効なルールだけを走らせ、オプションの既定値を渡す", () => {
    const { issues } = createLintApp(rules).lint(score, NO_SETTINGS);
    expect(issues.map((i) => [i.ruleId, i.message])).toEqual([["on", "all:a"]]);
  });

  it("推奨のみでは recommended だけ、すべてでは pedantic も走り、どちらでも nursery は走らない", () => {
    const app = createLintApp(tiered);
    expect(ran(app, NO_SETTINGS)).toEqual(["rec"]);
    expect(ran(app, app.withPreset(NO_SETTINGS, "all"))).toEqual(["other", "ped", "rec"]);
  });

  it("試験中のルールは個別に ON にすると走る", () => {
    const app = createLintApp(tiered);
    expect(ran(app, app.withRuleEnabled(NO_SETTINGS, "nur", true))).toEqual(["nur", "rec"]);
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
    expect(saved).toEqual({
      enabled: '{"on":false}',
      options: '{"on":{"scope":"group"}}',
      preset: "recommended",
    });
    expect(app.parseSettings(saved.enabled, saved.options, saved.preset)).toEqual(settings);
  });

  it("プリセットも保存値として往復する", () => {
    const app = createLintApp(tiered);
    const settings = app.withRuleEnabled(app.withPreset(NO_SETTINGS, "all"), "ped", false);
    const saved = app.serializeSettings(settings);
    expect(saved).toEqual({ enabled: '{"ped":false}', options: "{}", preset: "all" });
    expect(app.parseSettings(saved.enabled, saved.options, saved.preset)).toEqual(settings);
  });

  it("プリセットが無い・不正な保存値は推奨のみとして読む", () => {
    const app = createLintApp(tiered);
    expect(app.parseSettings('{"ped":true}', "{}")).toEqual({
      ...NO_SETTINGS,
      enabled: { ped: true },
    });
    expect(app.parseSettings("{}", "{}", "nursery")).toEqual(NO_SETTINGS);
    expect(app.parseSettings("{}", "{}", null)).toEqual(NO_SETTINGS);
  });

  it("プリセットを切り替えると、切り替え後の既定値と同じになった個別の設定は消える", () => {
    const app = createLintApp(tiered);
    let settings = app.withRuleEnabled(NO_SETTINGS, "ped", true);
    settings = app.withRuleEnabled(settings, "rec", false);
    expect(settings.enabled).toEqual({ ped: true, rec: false });
    settings = app.withPreset(settings, "all");
    expect(settings).toEqual({ preset: "all", enabled: { rec: false }, options: {} });
    settings = app.withPreset(app.withRuleEnabled(settings, "other", false), "recommended");
    expect(settings.enabled).toEqual({ rec: false });
  });

  it("グループの一括切り替えは、既定値との差分だけを残し、nursery に触れない", () => {
    const app = createLintApp(tiered);
    const on = app.withGroupEnabled(NO_SETTINGS, "dynamics", true);
    expect(on.enabled).toEqual({ ped: true });
    expect(app.settingsView(on).enabled).toEqual({
      rec: true,
      ped: true,
      nur: false,
      other: false,
    });

    const withNursery = app.withRuleEnabled(NO_SETTINGS, "nur", true);
    const off = app.withGroupEnabled(withNursery, "dynamics", false);
    expect(off.enabled).toEqual({ rec: false, nur: true });
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
    expect(settings).toEqual({
      preset: "recommended",
      enabled: { off: true },
      options: { on: { symbols: ["a", "b"] } },
    });
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
    expect(settings).toEqual({
      preset: "recommended",
      enabled: { off: true },
      options: { on: { symbols: ["a", "b"] } },
    });
  });

  it("保存したあとで既定値が変わったら、変えていないルールには新しい既定値が効く", () => {
    const saved = createLintApp(rules).serializeSettings({
      ...NO_SETTINGS,
      enabled: { on: false },
    });
    const changed = createLintApp([rule("on"), rule("off")]);
    const view = changed.settingsView(changed.parseSettings(saved.enabled, saved.options));
    expect(view.enabled).toEqual({ on: false, off: true });
  });

  it("設定画面に出す値は、どのルールも既定値で埋める", () => {
    const app = createLintApp(rules);
    const view = app.settingsView(app.withRuleOption(NO_SETTINGS, "on", "scope", "group"));
    expect(view).toEqual({
      preset: "recommended",
      enabled: { on: true, off: false },
      options: { on: { scope: "group", symbols: ["a"] }, off: { scope: "all", symbols: ["a"] } },
    });
  });
});

describe("createLintApp のカタログ", () => {
  it("ルールの情報の一覧は、カテゴリで分けずにルールの並びのまま", () => {
    const { ruleInfos } = createLintApp([
      rule("n", { category: "notation" }),
      rule("t", { category: "tempo" }),
    ]);
    expect(ruleInfos.map((r) => r.id)).toEqual(["n", "t"]);
  });

  it("カテゴリを決まった順に並べ、ルールの無いカテゴリは出さない", () => {
    const { catalog } = createLintApp([
      rule("n", { category: "notation" }),
      rule("t", { category: "tempo" }),
      rule("s", { category: "slur-tie" }),
    ]);
    expect(catalog.groups.map((g) => [g.category, g.label])).toEqual([
      ["tempo", "テンポ"],
      ["slur-tie", "スラー・タイ"],
      ["notation", "記譜"],
    ]);
  });

  it("カテゴリの中は重い順、同じ重さならルールの並びのまま", () => {
    const [group] = createLintApp([rule("i1"), rule("e", { severity: "error" }), rule("i2")])
      .catalog.groups;
    expect(group!.rules.map((r) => r.id)).toEqual(["e", "i1", "i2"]);
    expect(group!.rules[0]!.options.map((o) => o.key)).toEqual(["scope", "symbols"]);
  });

  it("試験中のルールは話題の欄に入れず、1 つの欄にまとめ、各ルールが段階を持つ", () => {
    const { catalog } = createLintApp([
      ...tiered,
      rule("nur-tempo", { category: "tempo", tier: "nursery" }),
    ]);
    expect(catalog.groups.map((g) => [g.category, g.rules.map((r) => [r.id, r.tier])])).toEqual([
      ["tempo", [["other", "pedantic"]]],
      [
        "dynamics",
        [
          ["rec", "recommended"],
          ["ped", "pedantic"],
        ],
      ],
    ]);
    expect(catalog.nursery.map((r) => [r.id, r.tier])).toEqual([
      ["nur-tempo", "nursery"],
      ["nur", "nursery"],
    ]);
  });
});
