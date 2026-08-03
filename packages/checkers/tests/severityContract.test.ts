import * as fs from "node:fs";
import * as path from "node:path";

import type { Severity } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { ALL_CHECKERS } from "../src/index.js";

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
const SRC = path.join(__dirname, "..", "src");

/**
 * ソース中に現れる severity リテラル。`severity:` の直書きに加えて
 * `onDuplicateSeverity:`（textPairChecker の上書き）も拾うため末尾一致で見る。
 * 三項演算子の両辺（`cond ? "warning" : "info"`）も両方拾う。
 */
function emittedSeverities(source: string): Severity[] {
  const out: Severity[] = [];
  for (const m of source.matchAll(/[Ss]everity:\s*([^,;\n]*)/g)) {
    for (const lit of m[1].matchAll(/"(error|warning|info)"/g)) out.push(lit[1] as Severity);
  }
  for (const m of source.matchAll(/\?\s*"(error|warning|info)"\s*:\s*"(error|warning|info)"/g)) {
    out.push(m[1] as Severity, m[2] as Severity);
  }
  return out;
}

/**
 * checker id → 実装ソース。
 *
 * ファイル名を id から機械的に導く（`div-unis` → `divUnisChecker.ts`）形にすると、
 * 名前が一致しない checker を黙って読み飛ばしてしまう。実際 div-unis の実装は
 * divisiChecker.ts にあり、この検査から外れていた。ファイルを全部読んで
 * `id: "..."` の宣言で引き当てる。
 */
function sourceByCheckerId(): Map<string, string> {
  const out = new Map<string, string>();
  for (const name of fs.readdirSync(SRC)) {
    if (!name.endsWith("Checker.ts")) continue;
    const source = fs.readFileSync(path.join(SRC, name), "utf8");
    const id = source.match(/^\s*id:\s*"([^"]+)"/m)?.[1];
    if (id) out.set(id, source);
  }
  return out;
}

describe("Checker.severity の契約", () => {
  const sources = sourceByCheckerId();

  // 引き当てに漏れがあると、下のテストが「何も見つからないから通る」になる。
  it("全 checker の実装ソースを引き当てられている", () => {
    const missing = ALL_CHECKERS.map((c) => c.id).filter((id) => !sources.has(id));
    expect(missing, "実装ソースを引き当てられない checker").toEqual([]);
  });

  it("宣言 severity は出しうる issue のうち最も重いものになっている", () => {
    for (const checker of ALL_CHECKERS) {
      const source = sources.get(checker.id);
      if (source === undefined) continue; // 上のテストが落ちる
      for (const emitted of emittedSeverities(source)) {
        expect(
          RANK[checker.severity],
          `${checker.id}: 宣言 ${checker.severity} より重い ${emitted} を出している`,
        ).toBeLessThanOrEqual(RANK[emitted]);
      }
    }
  });
});
