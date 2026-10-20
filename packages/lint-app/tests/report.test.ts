import type { Issue, IssueLocation } from "@score-linter/linter";
import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import {
  type FileResult,
  formatCsv,
  formatGithub,
  formatJson,
  formatMarkdown,
  formatText,
} from "../src/format.js";
import { countBySeverity, presentIssues } from "../src/report.js";

// アウフタクトのある楽譜。通し番号 1 の小節に「0」と表示されている。
const score = buildScore({
  parts: [
    { id: "p1", name: "Horn" },
    { id: "p2", name: "Horn" },
  ],
  measures: [{ label: "0", ticks: 480 }, { label: "1" }, { label: "2" }],
});

function issue(fields: Partial<Omit<Issue, "at">> & { at: Partial<IssueLocation> }): Issue {
  return {
    ruleId: "r",
    severity: "info",
    category: "notation",
    message: "m",
    detail: null,
    ...fields,
    at: { partId: null, staff: null, measure: 1, tick: 0, ...fields.at } as IssueLocation,
  };
}

describe("指摘の表示", () => {
  it("パート名と表示上の小節番号を付ける", () => {
    const [shown] = presentIssues(score, [issue({ at: { partId: "p2", staff: 1, measure: 2 } })]);
    expect(shown).toMatchObject({
      partId: "p2",
      partName: "Horn",
      staffIdx: 1,
      measure: 2,
      measureLabel: "1",
    });
  });

  it("楽譜全体の指摘はパートを持たない", () => {
    const [shown] = presentIssues(score, [issue({ at: {} })]);
    expect(shown).toMatchObject({ partId: null, partName: "", staffIdx: -1 });
  });

  it("メッセージの小節とパートのプレースホルダを表示の文字にする", () => {
    const [shown] = presentIssues(score, [
      issue({
        message: "{{part:other}} と違う（前回: {{measure:previousMeasure}}）",
        detail: { other: 0, previousMeasure: 1 },
        at: { staff: 1 },
      }),
    ]);
    expect(shown!.message).toBe("Horn と違う（前回: 0小節目）");
  });

  it("小節・譜表（楽譜全体が先）・重さ・tick の順に並べ、同じなら報告された順", () => {
    const shown = presentIssues(score, [
      issue({ ruleId: "a", at: { measure: 2, staff: 0 } }),
      issue({ ruleId: "b", severity: "error", at: { measure: 2, staff: 0 } }),
      issue({ ruleId: "c", at: { measure: 2 } }),
      issue({ ruleId: "d", at: { measure: 1, staff: 1, tick: 10 } }),
      issue({ ruleId: "e", at: { measure: 1, staff: 1, tick: 5 } }),
      issue({ ruleId: "f", at: { measure: 2, staff: 0 } }),
    ]);
    expect(shown.map((i) => i.ruleId)).toEqual(["e", "d", "c", "b", "a", "f"]);
  });

  it("重さごとに数える", () => {
    expect(
      countBySeverity([{ severity: "info" }, { severity: "error" }, { severity: "info" }]),
    ).toEqual({ error: 1, warning: 0, info: 2 });
  });
});

describe("出力の整形", () => {
  const issues = presentIssues(score, [
    issue({ severity: "warning", message: 'a|b "c"', at: { partId: "p1", staff: 0, measure: 2 } }),
    issue({ ruleId: "g", message: "全体", at: { measure: 3 } }),
  ]);
  const results: FileResult[] = [{ file: "a.musicxml", issues }];

  it("Markdown は表の区切りを逃がし、空の欄を - にする", () => {
    expect(formatMarkdown(results)).toBe(
      [
        "| 重大度 | パート | 小節 | メッセージ | ルール |",
        "| --- | --- | --- | --- | --- |",
        '| WARNING | Horn | 1 | a\\|b "c" | r |',
        "| INFO | - | 2 | 全体 | g |",
      ].join("\n"),
    );
  });

  it("CSV はすべての値を引用符で囲み、引用符を二重にする", () => {
    expect(formatCsv(results).split("\r\n")).toEqual([
      '"重大度","パート","小節","メッセージ","ルール"',
      '"WARNING","Horn","1","a|b ""c""","r"',
      '"INFO","","2","全体","g"',
    ]);
  });

  it("複数のファイルではファイルの列を足す", () => {
    const header = formatCsv([...results, { file: "b.mxl", issues: [] }]).split("\r\n")[0];
    expect(header).toBe('"ファイル","重大度","パート","小節","メッセージ","ルール"');
  });

  it("GitHub のアノテーションはパートと小節をメッセージの頭に置く", () => {
    expect(formatGithub(results).split("\n")).toEqual([
      '::warning file=a.musicxml,title=r::Horn 1小節目: a|b "c"',
      "::notice file=a.musicxml,title=g::2小節目: 全体",
    ]);
  });

  it("JSON は件数の集計とファイルごとの指摘を持つ", () => {
    const parsed = JSON.parse(formatJson(results));
    expect(parsed.summary).toEqual({ files: 1, issues: 2, error: 0, warning: 1, info: 1 });
    expect(parsed.results[0].issues[0]).toMatchObject({
      partName: "Horn",
      staffIdx: 0,
      measure: 2,
    });
  });

  it("テキストはファイル名の見出しと集計を付け、ファイル名が空なら付けない", () => {
    const text = formatText(results);
    expect(text.split("\n")[0]).toBe("a.musicxml");
    expect(text).toContain("1 ファイル / 2 件（error 0, warning 1, info 1）");
    const bare = formatText([{ file: "", issues }]);
    expect(bare.split("\n")[0]).toContain("m.1");
    expect(bare).not.toContain("ファイル");
  });
});
