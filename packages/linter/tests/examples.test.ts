import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { builtinRules } from "../src/rules/index.ts";
import { runRule } from "./helpers.ts";

describe.each(builtinRules.map((rule) => [rule.id, rule] as const))("%s", (_id, rule) => {
  it("README に載せる docs と、invalid・valid の例を 1 つ以上持つ", () => {
    expect(rule.meta.docs).toBeTruthy();
    expect(rule.examples?.invalid.length).toBeGreaterThan(0);
    expect(rule.examples?.valid.length).toBeGreaterThan(0);
  });

  it.each((rule.examples?.invalid ?? []).map((example, i) => [i, example] as const))(
    "invalid[%i] で指摘を出す",
    (_index, { score, options }) => {
      const issues = runRule(rule, buildScore(score), options);
      expect(issues.filter((i) => i.ruleId !== rule.id)).toEqual([]);
      expect(issues.length).toBeGreaterThan(0);
    },
  );

  it.each((rule.examples?.valid ?? []).map((example, i) => [i, example] as const))(
    "valid[%i] では指摘を出さない",
    (_index, { score, options }) => {
      expect(runRule(rule, buildScore(score), options)).toEqual([]);
    },
  );
});
