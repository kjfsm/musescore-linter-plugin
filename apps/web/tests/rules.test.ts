import { getCheckerList } from "@musescore-linter/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { allRuleIds } from "../src/lib/lint";
import {
  effectiveOptions,
  isEnabled,
  loadEnabledRules,
  loadRuleOptions,
  ruleGroups,
  saveEnabledRules,
  saveRuleOptions,
} from "../src/lib/rules";

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
      "slur-tie",
      "notation",
    ]);
  });

  it("カテゴリに日本語ラベルを付ける", () => {
    expect(ruleGroups()[0].label).not.toBe("articulation");
  });

  it("カテゴリ内は severity 順（error→warning→info）に並べる", () => {
    const dynamics = ruleGroups().find((g) => g.category === "dynamics");
    expect(dynamics?.checkers.map((c) => c.severity)).toEqual([
      "error",
      "warning",
      "info",
      "info",
      "info",
      "info",
    ]);
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

describe("loadRuleOptions / saveRuleOptions", () => {
  const KEY = "musescore-linter:rule-options";
  const OPTION_RULE = "slur-tie-articulation-consistency";
  let storage: Storage;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it("保存していなければ空（＝全設定が既定）", () => {
    expect(loadRuleOptions(storage)).toEqual({});
  });

  it("checker の登録を待たずに呼ばれても保存済みの設定を落とさない", async () => {
    // 登録前だと getCheckerList() が空になり、全設定が「未知の checker」として捨てられる。
    // App の mount 直後に save の effect が走るので、そのまま localStorage を空で
    // 上書きしてユーザー設定を壊してしまう。
    // 「まだ一度も登録していない」状態はモジュール内フラグ込みで作る必要があるため、
    // モジュールごと読み直してから最初の呼び出しが loadRuleOptions になるようにする。
    vi.resetModules();
    const fresh = await import("../src/lib/rules");
    const saved = fakeStorage({ [KEY]: JSON.stringify({ [OPTION_RULE]: { scope: "group" } }) });
    expect(fresh.loadRuleOptions(saved)).toEqual({ [OPTION_RULE]: { scope: "group" } });
  });

  it("既定と違う値だけ保存して読み戻せる", () => {
    saveRuleOptions(storage, { [OPTION_RULE]: { scope: "group" } });
    expect(loadRuleOptions(storage)).toEqual({ [OPTION_RULE]: { scope: "group" } });
  });

  it("既定と同じ値は保存しない", () => {
    saveRuleOptions(storage, { [OPTION_RULE]: { scope: "all" } });
    expect(JSON.parse(storage.getItem(KEY) ?? "{}")).toEqual({});
  });

  it("multiselect は順序が違っても既定と同じなら保存しない", () => {
    saveRuleOptions(storage, { [OPTION_RULE]: { groupSymbols: ["square", "bracket"] } });
    expect(JSON.parse(storage.getItem(KEY) ?? "{}")).toEqual({});
  });

  it("ON/OFF とは別のキーに保存する（真偽値扱いで配列を壊さないため）", () => {
    saveRuleOptions(storage, { [OPTION_RULE]: { scope: "group" } });
    expect(storage.getItem("musescore-linter:rule-overrides")).toBeNull();
  });

  it("未知の checker / key / 不正値は捨てる", () => {
    const dirty = fakeStorage({
      [KEY]: JSON.stringify({
        "no-such-rule": { scope: "group" },
        [OPTION_RULE]: { scope: "nonsense", nope: 1, groupSymbols: ["bracket"] },
      }),
    });
    expect(loadRuleOptions(dirty)).toEqual({ [OPTION_RULE]: { groupSymbols: ["bracket"] } });
  });

  it("壊れた値は捨てて既定に戻す", () => {
    expect(loadRuleOptions(fakeStorage({ [KEY]: "{" }))).toEqual({});
    expect(loadRuleOptions(fakeStorage({ [KEY]: "[1]" }))).toEqual({});
  });
});

describe("effectiveOptions", () => {
  it("保存済みの差分を既定の上に重ねる", () => {
    allRuleIds();
    const checker = getCheckerList().find((c) => c.options)!;
    expect(effectiveOptions(checker, {})).toEqual({
      scope: "all",
      groupSymbols: ["bracket", "square"],
    });
    expect(effectiveOptions(checker, { [checker.id]: { scope: "group" } }).scope).toBe("group");
  });
});
