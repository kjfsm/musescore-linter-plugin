import { readFileSync } from "node:fs";
import { join } from "node:path";

import { lintScore, parseSettings } from "@score-linter/lint-app";
import { builtinRules, createLinter } from "@score-linter/linter";
import type { MuseScore } from "@score-linter/musescore-api-types";
import { readMusicXml } from "@score-linter/reader-musicxml";
import { describe, expect, it } from "vitest";

import { duetScore, host } from "../../../packages/reader-musescore/tests/fixtures/duetMock.js";
import { formatForCopy, lintCurrentScore, selectionFor, settingsView } from "../src/lint.js";

const NO_SETTINGS = { enabled: {}, options: {} };
const withScore = (): MuseScore => ({ ...host, curScore: duetScore() }) as unknown as MuseScore;

const duetXml = readFileSync(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "packages",
    "reader-musicxml",
    "tests",
    "fixtures",
    "duet.musicxml",
  ),
  "utf8",
);

describe("lintCurrentScore", () => {
  it("MuseScore から読んでも、同じ楽譜の MusicXML と同じ指摘を返す", () => {
    const fromMuseScore = lintCurrentScore(withScore(), NO_SETTINGS, false).issues;
    const fromMusicXml = lintScore(createLinter(builtinRules), readMusicXml(duetXml), NO_SETTINGS);
    // パートの識別子だけは読み込み口ごとに違う（MuseScore は並び順、MusicXML は part の id）
    const strip = (issues: typeof fromMusicXml) => issues.map((i) => ({ ...i, partId: "" }));
    expect(strip(fromMuseScore)).toEqual(strip(fromMusicXml));
    expect(fromMuseScore.map((i) => i.ruleId)).toContain("tie-pitch-mismatch");
  });

  it("件数とパート名を表示用に返す", () => {
    const run = lintCurrentScore(withScore(), NO_SETTINGS, false);
    expect(run.counts.warning).toBe(run.issues.filter((i) => i.severity === "warning").length);
    expect(run.parts.map((p) => p.name)).toEqual(["Violin I", "Violin II"]);
    expect(run.perfText).toBe("");
  });

  it("設定で無効にしたルールは走らせない", () => {
    const settings = parseSettings(builtinRules, '{"tie-pitch-mismatch":false}', null);
    const run = lintCurrentScore(withScore(), settings, false);
    expect(run.issues.some((i) => i.ruleId === "tie-pitch-mismatch")).toBe(false);
  });

  it("計測を頼むと読み込みとルールごとの時間を返す", () => {
    const text = lintCurrentScore(withScore(), NO_SETTINGS, true).perfText;
    expect(text).toContain("readMuseScore");
    expect(text).toContain("pizz-arco");
  });

  it("型の生成元と版が違えば、警告を指摘として先頭に置き、件数にも数える", () => {
    const old = { ...host, curScore: duetScore(), mscoreMajorVersion: 3 } as unknown as MuseScore;
    const run = lintCurrentScore(old, NO_SETTINGS, false);
    expect(run.issues[0]).toMatchObject({
      ruleId: "internal-version-mismatch",
      severity: "warning",
    });
    expect(run.issues[0]?.message).toMatch(/バージョン不一致/);
    expect(run.counts.warning).toBe(run.issues.filter((i) => i.severity === "warning").length);
  });

  it("楽譜が開かれていなければ投げる", () => {
    expect(() => lintCurrentScore(host, NO_SETTINGS, false)).toThrow(/スコア/);
  });
});

describe("selectionFor", () => {
  it("指摘の小節の最初と最後のセグメントを範囲にする", () => {
    const run = lintCurrentScore(withScore(), NO_SETTINGS, false);
    const tie = run.issues.find((i) => i.ruleId === "tie-pitch-mismatch")!;
    const origin = run.origins.measures[tie.measure - 1]!;
    expect(selectionFor(run, tie)).toEqual({
      startTick: origin.firstSegmentTick,
      endTick: origin.lastSegmentTick + 1,
      staff: tie.staffIdx,
    });
  });

  it("小節を持たない指摘では範囲を作らない", () => {
    const run = lintCurrentScore(withScore(), NO_SETTINGS, false);
    expect(selectionFor(run, { ...run.issues[0]!, measure: 0 })).toBeNull();
  });
});

describe("formatForCopy", () => {
  it("ファイル名の見出しを付けずに整形する", () => {
    const { issues } = lintCurrentScore(withScore(), NO_SETTINGS, false);
    expect(formatForCopy(issues, "markdown").split("\n")[0]).toBe(
      "| 重大度 | パート | 小節 | メッセージ | ルール |",
    );
    expect(formatForCopy(issues, "text")).not.toContain("ファイル");
    expect(formatForCopy([], "csv")).toBe("");
  });
});

describe("settingsView", () => {
  it("どのルールも既定値で埋める", () => {
    const view = settingsView(parseSettings(builtinRules, '{"pizz-arco":false}', null));
    expect(view.enabled["pizz-arco"]).toBe(false);
    expect(view.enabled["opening-tempo"]).toBe(true);
    expect(view.options["slur-tie-articulation-consistency"]).toEqual({
      scope: "all",
      groupSymbols: ["bracket", "square"],
    });
  });
});
