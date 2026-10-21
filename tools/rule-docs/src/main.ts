import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { builtinRules, type Rule, type RuleTier } from "@score-linter/linter";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const README = join(ROOT, "README.md");
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

// 表の桁揃えは oxfmt に任せる。全角の幅の数え方を自前で再現すると、lint の整形と食い違う
function format(markdown: string): string {
  const result = spawnSync("oxfmt", ["--stdin-filepath=README.md"], {
    cwd: ROOT,
    input: markdown,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`oxfmt が失敗しました: ${result.stderr}`);
  return result.stdout;
}

const readme = readFileSync(README, "utf8");
const start = readme.indexOf(START);
const end = readme.indexOf(END);
if (start < 0 || end < start) throw new Error(`README.md に ${START} と ${END} がありません`);
const expected = format(
  `${readme.slice(0, start + START.length)}\n\n${rulesTable(builtinRules)}\n\n${readme.slice(end)}`,
);

if (process.argv.includes("--check")) {
  if (expected !== readme) {
    console.error("README.md のルール一覧が古くなっています。pnpm docs:rules で作り直してください");
    process.exit(1);
  }
} else {
  writeFileSync(README, expected);
}
