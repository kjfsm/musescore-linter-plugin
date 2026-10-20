import type { ReportedIssue } from "@score-linter/lint-app";
import { describe, expect, it } from "vitest";

import { exportResults, summarize, toRows } from "../src/lib/rows";

function issue(over: Partial<ReportedIssue> = {}): ReportedIssue {
  return {
    ruleId: "opening-tempo",
    severity: "error",
    category: "tempo",
    message: "冒頭にテンポ表記がありません",
    partId: "P1",
    partName: "Violin I",
    staffIdx: 0,
    measure: 2,
    measureLabel: "1",
    tick: 0,
    detail: null,
    ...over,
  };
}

describe("toRows", () => {
  it("表示上の小節番号とパート名をそのまま行にする", () => {
    expect(toRows([issue()])[0]).toMatchObject({
      measureLabel: "1",
      partName: "Violin I",
      message: "冒頭にテンポ表記がありません",
    });
  });

  it("同じ位置・同じルールの指摘でもキーが衝突しない", () => {
    const rows = toRows([issue(), issue()]);
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });
});

describe("summarize", () => {
  it("全ファイルの件数を重さごとに足し合わせる", () => {
    const results = [
      { counts: { error: 1, warning: 0, info: 2 } },
      { counts: { error: 0, warning: 3, info: 1 } },
    ];
    expect(summarize(results)).toEqual({ error: 1, warning: 3, info: 3 });
  });
});

describe("exportResults", () => {
  const results = [{ index: 0, file: "a.musicxml", issues: [issue()] }];

  it("Markdown は表として書き出す", () => {
    const out = exportResults(results, "markdown");
    expect(out.extension).toBe("md");
    expect(out.text.split("\n")[2]).toBe(
      "| ERROR | Violin I | 1 | 冒頭にテンポ表記がありません | opening-tempo |",
    );
  });

  // Excel は BOM が無いと UTF-8 の CSV を Shift_JIS として開き、日本語が化ける
  it("CSV は BOM を付けて書き出す", () => {
    const out = exportResults(results, "csv");
    expect(out.extension).toBe("csv");
    expect(out.text.startsWith('\uFEFF"重大度"')).toBe(true);
  });
});
