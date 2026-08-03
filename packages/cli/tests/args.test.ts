import type { Checker } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import {
  assertKnownRules,
  parseArgs,
  resolveEnabledRules,
  resolveRuleOptions,
  UsageError,
} from "../src/args.js";

const RULES = ["opening-tempo", "pizz-arco", "final-barline"];

const optionChecker: Checker = {
  id: "scoped",
  name: "scoped",
  description: "",
  category: "test",
  severity: "info",
  defaultEnabled: true,
  options: [
    {
      key: "scope",
      label: "範囲",
      type: "select",
      choices: [
        { value: "all", label: "全部" },
        { value: "group", label: "グループ" },
      ],
      default: "all",
    },
    {
      key: "symbols",
      label: "記号",
      type: "multiselect",
      choices: [
        { value: "bracket", label: "角括弧" },
        { value: "square", label: "括弧" },
      ],
      default: ["bracket"],
    },
  ],
  run: () => [],
};

const plainChecker: Checker = { ...optionChecker, id: "plain", options: undefined };
const CHECKERS = [optionChecker, plainChecker];

describe("parseArgs", () => {
  it("フラグでない引数はすべてファイルとして扱う", () => {
    const o = parseArgs(["a.musicxml", "b.mxl"]);
    expect(o.files).toEqual(["a.musicxml", "b.mxl"]);
    expect(o.format).toBe("pretty");
    expect(o.failOn).toBe("error");
  });

  it("-- 以降はフラグに見えてもファイルとして扱う", () => {
    expect(parseArgs(["--", "--weird-name.xml"]).files).toEqual(["--weird-name.xml"]);
  });

  it("--json は --format=json の別名", () => {
    expect(parseArgs(["--json", "a.xml"]).format).toBe("json");
    expect(parseArgs(["--format=github", "a.xml"]).format).toBe("github");
  });

  it("--rule / --no-rule は複数回指定できる", () => {
    const o = parseArgs([
      "--rule=opening-tempo",
      "--rule=pizz-arco",
      "--no-rule=final-barline",
      "a.xml",
    ]);
    expect(o.onlyRules).toEqual(["opening-tempo", "pizz-arco"]);
    expect(o.disabledRules).toEqual(["final-barline"]);
  });

  it("未知のオプションを拒否する", () => {
    expect(() => parseArgs(["--nope"])).toThrow(UsageError);
  });

  it("値が必要なオプションに値が無ければ拒否する", () => {
    expect(() => parseArgs(["--format"])).toThrow(/値が必要です/);
  });

  it("列挙値の候補外を拒否する", () => {
    expect(() => parseArgs(["--fail-on=fatal"])).toThrow(/error \/ warning/);
  });
});

describe("resolveEnabledRules", () => {
  it("指定が無ければ空（= 各 checker の defaultEnabled に従う）", () => {
    expect(resolveEnabledRules({ onlyRules: [], disabledRules: [] }, RULES)).toEqual({});
  });

  it("--rule があれば指定されたものだけ true にする", () => {
    expect(resolveEnabledRules({ onlyRules: ["pizz-arco"], disabledRules: [] }, RULES)).toEqual({
      "opening-tempo": false,
      "pizz-arco": true,
      "final-barline": false,
    });
  });

  it("--no-rule は --rule より後に適用される", () => {
    expect(
      resolveEnabledRules({ onlyRules: ["pizz-arco"], disabledRules: ["pizz-arco"] }, RULES)[
        "pizz-arco"
      ],
    ).toBe(false);
  });
});

describe("assertKnownRules", () => {
  it("存在しない checker id を拒否する", () => {
    expect(() => assertKnownRules({ onlyRules: ["nope"], disabledRules: [] }, RULES)).toThrow(
      /'nope' は存在しません/,
    );
  });

  it("存在する id は通す", () => {
    expect(() =>
      assertKnownRules({ onlyRules: ["pizz-arco"], disabledRules: ["final-barline"] }, RULES),
    ).not.toThrow();
  });
});

describe("--rule-option の解析", () => {
  it("<ruleId>.<key>=<value> に割る", () => {
    expect(parseArgs(["--rule-option=scoped.scope=group"]).ruleOptions).toEqual([
      { ruleId: "scoped", key: "scope", value: "group" },
    ]);
  });

  it("値に = が含まれていても最初の = で割る", () => {
    expect(parseArgs(["--rule-option=scoped.scope=a=b"]).ruleOptions[0].value).toBe("a=b");
  });

  it("値がなければエラー", () => {
    expect(() => parseArgs(["--rule-option"])).toThrow(UsageError);
    expect(() => parseArgs(["--rule-option=scoped.scope"])).toThrow(/<ruleId>\.<key>=<value>/);
  });

  it("ruleId と key を区切る . が無ければエラー", () => {
    expect(() => parseArgs(["--rule-option=scope=group"])).toThrow(/<ruleId>\.<key>=<value>/);
  });
});

describe("resolveRuleOptions", () => {
  const opts = (...argv: string[]) => parseArgs(argv);

  it("指定が無ければ空", () => {
    expect(resolveRuleOptions(opts(), CHECKERS)).toEqual({});
  });

  it("select と multiselect を値に変換する", () => {
    expect(
      resolveRuleOptions(
        opts("--rule-option=scoped.scope=group", "--rule-option=scoped.symbols=square,bracket"),
        CHECKERS,
      ),
    ).toEqual({ scoped: { scope: "group", symbols: ["bracket", "square"] } });
  });

  it("同じキーの重複指定は後勝ち", () => {
    expect(
      resolveRuleOptions(
        opts("--rule-option=scoped.scope=group", "--rule-option=scoped.scope=all"),
        CHECKERS,
      ),
    ).toEqual({ scoped: { scope: "all" } });
  });

  it("存在しない checker はエラー", () => {
    expect(() => resolveRuleOptions(opts("--rule-option=nope.scope=all"), CHECKERS)).toThrow(
      /'nope' は存在しません/,
    );
  });

  it("存在しない key はエラーで、指定できる key を示す", () => {
    expect(() => resolveRuleOptions(opts("--rule-option=scoped.nope=1"), CHECKERS)).toThrow(
      /scope \/ symbols/,
    );
  });

  it("options を持たない checker にはその旨を返す", () => {
    expect(() => resolveRuleOptions(opts("--rule-option=plain.scope=all"), CHECKERS)).toThrow(
      /設定できる項目はありません/,
    );
  });

  it("choices 外の値はエラー", () => {
    expect(() => resolveRuleOptions(opts("--rule-option=scoped.scope=nope"), CHECKERS)).toThrow(
      /all \/ group/,
    );
    expect(() => resolveRuleOptions(opts("--rule-option=scoped.symbols=nope"), CHECKERS)).toThrow(
      /nope/,
    );
  });
});
