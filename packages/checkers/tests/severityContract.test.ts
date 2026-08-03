import { getCheckerList, type Severity } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { ALL_CHECKERS } from "../src/index.js";

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** ソース中に現れる `severity: "..."` の直書き（checker 宣言のものを除く）。 */
function emittedSeverities(source: string): Severity[] {
  const out: Severity[] = [];
  for (const m of source.matchAll(/severity:\s*(?:[^,\n]*\?\s*)?"(error|warning|info)"/g)) {
    out.push(m[1] as Severity);
  }
  for (const m of source.matchAll(/"(error|warning|info)"\s*:\s*"(error|warning|info)"/g)) {
    out.push(m[1] as Severity, m[2] as Severity);
  }
  return out;
}

describe("Checker.severity の契約", () => {
  it("宣言 severity は出しうる issue のうち最も重いものになっている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.join(__dirname, "..", "src");

    for (const checker of ALL_CHECKERS) {
      // ファイル名は checker の export 名から引く（xxxChecker → xxxChecker.ts）
      const file = path.join(dir, `${checkerFileName(checker.id)}.ts`);
      if (!fs.existsSync(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      for (const emitted of emittedSeverities(source)) {
        expect(
          RANK[checker.severity],
          `${checker.id}: 宣言 ${checker.severity} より重い ${emitted} を出している`,
        ).toBeLessThanOrEqual(RANK[emitted]);
      }
    }
  });

  it("設定 UI に出す severity は全 checker で宣言されている", () => {
    for (const checker of getCheckerList().length > 0 ? getCheckerList() : ALL_CHECKERS) {
      expect(RANK[checker.severity], checker.id).toBeDefined();
    }
  });
});

/** checker id（kebab-case）から実装ファイル名（camelCase + "Checker"）を作る。 */
function checkerFileName(id: string): string {
  const camel = id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return `${camel}Checker`;
}
