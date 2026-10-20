import { defineRule, type Rule } from "@score-linter/linter";
import { describe, expect, it } from "vitest";

import { ruleGroups } from "../src/catalog.js";
import {
  isRuleEnabled,
  parseSettings,
  ruleOptionValues,
  serializeSettings,
  withRuleEnabled,
  withRuleOption,
} from "../src/settings.js";

function rule(id: string, defaultEnabled: boolean, extra: Partial<Rule["meta"]> = {}): Rule {
  return defineRule({
    id,
    meta: {
      name: id,
      description: "",
      category: "notation",
      severity: "info",
      defaultEnabled,
      ...extra,
    },
    options: {
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
    },
    run() {},
  });
}

const rules = [rule("on", true), rule("off", false)];

describe("設定", () => {
  it("既定値から変えた分だけを保存する", () => {
    let settings = parseSettings(rules, null, null);
    settings = withRuleEnabled(rules, settings, "on", false);
    settings = withRuleEnabled(rules, settings, "off", false);
    settings = withRuleOption(rules, settings, "on", "scope", "group");
    settings = withRuleOption(rules, settings, "on", "symbols", ["a"]);
    expect(serializeSettings(settings)).toEqual({
      enabled: '{"on":false}',
      options: '{"on":{"scope":"group"}}',
    });
  });

  it("変えた値を元に戻すと保存から消える", () => {
    let settings = withRuleEnabled(rules, parseSettings(rules, null, null), "on", false);
    settings = withRuleEnabled(rules, settings, "on", true);
    expect(settings.enabled).toEqual({});
  });

  it("保存したあとで既定値が変わったら、変えていないルールには新しい既定値が効く", () => {
    const saved = serializeSettings(
      withRuleEnabled(rules, parseSettings(rules, null, null), "on", false),
    );
    const changedDefaults = [rule("on", true), rule("off", true)];
    const settings = parseSettings(changedDefaults, saved.enabled, saved.options);
    expect(isRuleEnabled(changedDefaults[0]!, settings)).toBe(false);
    expect(isRuleEnabled(changedDefaults[1]!, settings)).toBe(true);
  });

  it("全値で保存した旧版の値も、既定と違う分だけ残して読む", () => {
    const settings = parseSettings(
      rules,
      '{"on":true,"off":true}',
      '{"on":{"scope":"all","symbols":["b","a"]}}',
    );
    expect(settings).toEqual({ enabled: { off: true }, options: { on: { symbols: ["a", "b"] } } });
  });

  it("未知のルール・キー・型の合わない値・壊れた JSON は捨てる", () => {
    expect(
      parseSettings(rules, '{"gone":false,"on":"no"}', '{"on":{"scope":"x","nope":1}}'),
    ).toEqual({
      enabled: {},
      options: {},
    });
    expect(parseSettings(rules, "{", "[1,2]")).toEqual({ enabled: {}, options: {} });
  });

  it("表示用のオプションの値は既定値で埋める", () => {
    const settings = withRuleOption(
      rules,
      parseSettings(rules, null, null),
      "on",
      "scope",
      "group",
    );
    expect(ruleOptionValues(rules[0]!, settings)).toEqual({ scope: "group", symbols: ["a"] });
  });
});

describe("ルールの一覧", () => {
  it("カテゴリを決まった順に並べ、表に無いカテゴリも末尾に含める", () => {
    const groups = ruleGroups([
      rule("x", true, { category: "zzz" }),
      rule("n", true, { category: "notation" }),
      rule("t", true, { category: "tempo" }),
    ]);
    expect(groups.map((g) => [g.category, g.label])).toEqual([
      ["tempo", "テンポ"],
      ["notation", "記譜"],
      ["zzz", "zzz"],
    ]);
  });

  it("カテゴリの中は重い順、同じ重さならルールの並びのまま", () => {
    const [group] = ruleGroups([
      rule("i1", true),
      rule("e", true, { severity: "error" }),
      rule("i2", true),
    ]);
    expect(group!.rules.map((r) => r.id)).toEqual(["e", "i1", "i2"]);
    expect(group!.rules[0]!.options.map((o) => o.key)).toEqual(["scope", "symbols"]);
  });
});
