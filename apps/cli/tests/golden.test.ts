import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { type RunIO, run } from "../src/run.js";

const REPO_ROOT = join(__dirname, "..", "..", "..");

// 作り直しの前後で検出結果が変わっていないことを確かめる基準。
// message は表示の都合で書き換わるので比べない。位置と内容（detail）だけを比べる。
// 意図して結果を変えたときは `pnpm vitest run -u` で更新し、差分の理由をコミットに書く。
const SCORES = [
  "packages/reader-musicxml/tests/fixtures/duet.musicxml",
  "fixtures/scores/Beethoven_Op.67_1_cut/symphony-no-5.musicxml",
  "fixtures/scores/Beethoven_Op.67_1_full/Beethoven_Op.67_1_full.musicxml",
];

interface JsonIssue {
  ruleId: string;
  severity: string;
  partName: string;
  staffIdx: number;
  measure: number;
  tick: number;
  detail: unknown;
}

function lint(file: string): JsonIssue[] {
  const out: string[] = [];
  const io: RunIO = {
    readFile: (path) => readFileSync(join(REPO_ROOT, path)),
    stdout: (t) => out.push(t),
    stderr: () => {},
  };
  run(["--format=json", "--fail-on=none", file], io);
  const parsed = JSON.parse(out.join("\n")) as { results: { issues: JsonIssue[] }[] };
  return parsed.results.flatMap((r) => r.issues);
}

function toLines(issues: JsonIssue[]): string {
  return `${issues
    .map(({ ruleId, severity, partName, staffIdx, measure, tick, detail }) =>
      JSON.stringify({ ruleId, severity, partName, staffIdx, measure, tick, detail }),
    )
    .join("\n")}\n`;
}

describe("検出結果の回帰基準", () => {
  for (const file of SCORES) {
    it(file, async () => {
      const name = file
        .split("/")
        .pop()!
        .replace(/\.musicxml$/, "");
      await expect(toLines(lint(file))).toMatchFileSnapshot(
        join(REPO_ROOT, "fixtures", "golden", `${name}.jsonl`),
      );
    });
  }
});
