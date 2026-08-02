import { getCheckerList } from "@musescore-linter/core";
import { beforeEach, describe, expect, it } from "vitest";

import { allRuleIds } from "../src/lib/lint";
import { isEnabled, loadEnabledRules, ruleGroups, saveEnabledRules } from "../src/lib/rules";

/** localStorage を持たない Node 環境向けの最小実装。 */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

describe("ruleGroups", () => {
  it("全 checker をカテゴリ別に過不足なく並べる", () => {
    const groups = ruleGroups();
    const total = groups.reduce((n, g) => n + g.checkers.length, 0);
    expect(total).toBe(allRuleIds().length);
    expect(groups.map((g) => g.category)).toEqual([
      "articulation",
      "dynamics",
      "tempo",
      "notation",
    ]);
  });

  it("カテゴリに日本語ラベルを付ける", () => {
    expect(ruleGroups()[0].label).not.toBe("articulation");
  });
});

describe("isEnabled", () => {
  // getCheckerList() は登録後でないと空。allRuleIds() が登録を保証する。
  allRuleIds();
  const checker = getCheckerList()[0];

  it("指定が無ければ defaultEnabled に従う", () => {
    expect(isEnabled(checker, {})).toBe(checker.defaultEnabled !== false);
  });

  it("明示指定があればそれを優先する", () => {
    expect(isEnabled(checker, { [checker.id]: false })).toBe(false);
    expect(isEnabled(checker, { [checker.id]: true })).toBe(true);
  });
});

describe("loadEnabledRules / saveEnabledRules", () => {
  let storage: Storage;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it("保存していなければ空（＝全ルール既定）", () => {
    expect(loadEnabledRules(storage)).toEqual({});
  });

  it("保存した設定を読み戻せる", () => {
    const id = allRuleIds()[0];
    saveEnabledRules(storage, { [id]: false });
    expect(loadEnabledRules(storage)).toEqual({ [id]: false });
  });

  it("既定と同じ値は保存しない（checker が増えても既定に追従させるため）", () => {
    const [a, b] = allRuleIds();
    saveEnabledRules(storage, { [a]: false, [b]: true });
    const raw = JSON.parse(storage.getItem("musescore-linter:rule-overrides") ?? "{}") as Record<
      string,
      boolean
    >;
    // b は defaultEnabled: true なので差分ではない
    expect(Object.keys(raw)).toEqual([a]);
  });

  it("未知の checker id は保存も復元もしない", () => {
    saveEnabledRules(storage, { "no-such-rule": false });
    expect(loadEnabledRules(storage)).toEqual({});

    const dirty = fakeStorage({
      "musescore-linter:rule-overrides": JSON.stringify({
        "no-such-rule": false,
      }),
    });
    expect(loadEnabledRules(dirty)).toEqual({});
  });

  it("壊れた値は捨てて既定に戻す", () => {
    expect(loadEnabledRules(fakeStorage({ "musescore-linter:rule-overrides": "{" }))).toEqual({});
    expect(loadEnabledRules(fakeStorage({ "musescore-linter:rule-overrides": "[1]" }))).toEqual({});
  });
});
