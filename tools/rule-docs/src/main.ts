import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { builtinRules, type Rule, type RuleTier } from "@score-linter/linter";

const README = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "README.md");
const START = "<!-- rules:start -->";
const END = "<!-- rules:end -->";

const TIER_LABEL: Record<RuleTier, string> = {
  recommended: "推奨",
  pedantic: "細かい指摘",
  nursery: "試験中",
};

function row(rule: Rule): string {
  if (!rule.meta.docs) throw new Error(`${rule.id} に meta.docs がありません`);
  return `| ${rule.meta.name} | ${rule.meta.severity} | ${TIER_LABEL[rule.meta.tier]} | ${rule.meta.docs} |`;
}

function rulesTable(rules: readonly Rule[]): string {
  return [
    "| ルール | severity（最も重いもの） | 段階 | 目的 |",
    "| --- | --- | --- | --- |",
    ...rules.map(row),
  ].join("\n");
}

const readme = readFileSync(README, "utf8");
const start = readme.indexOf(START);
const end = readme.indexOf(END);
if (start < 0 || end < start) throw new Error(`README.md に ${START} と ${END} がありません`);
writeFileSync(
  README,
  `${readme.slice(0, start + START.length)}\n\n${rulesTable(builtinRules)}\n\n${readme.slice(end)}`,
);
