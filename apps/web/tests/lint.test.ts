import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Settings } from "@score-linter/lint-app";
import { describe, expect, it } from "vitest";

import { lintParsed, parseFile } from "../src/lib/lint";

const FIXTURES = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "reader-musicxml",
  "tests",
  "fixtures",
);
const duetXml = new Uint8Array(readFileSync(join(FIXTURES, "duet.musicxml")));
const duetMscz = new Uint8Array(readFileSync(join(FIXTURES, "duet.mscz")));

describe("parseFile", () => {
  it("MusicXML を Score まで読む", () => {
    const parsed = parseFile("duet.musicxml", duetXml);
    expect(parsed.error).toBeUndefined();
    expect(parsed.score?.parts).toHaveLength(2);
    expect(parsed.xml).toContain("score-partwise");
  });

  it("MusicXML でないものは error として返す（例外を投げない）", () => {
    const parsed = parseFile("bad.xml", new TextEncoder().encode("<html/>"));
    expect(parsed.score).toBeUndefined();
    expect(parsed.error).toContain("score-partwise");
  });

  it(".mscz は MuseScore 独自形式なので読めず error になる", () => {
    const parsed = parseFile("duet.mscz", duetMscz);
    expect(parsed.score).toBeUndefined();
    expect(parsed.error).toBeTruthy();
  });
});

const ALL_SETTINGS: Settings = { preset: "all", enabled: {}, options: {} };

describe("lintParsed", () => {
  const parsed = [parseFile("duet.musicxml", duetXml)];

  it("fixture に仕込まれた記譜ミスを検出する", () => {
    const [result] = lintParsed(parsed, ALL_SETTINGS);
    if (!result) throw new Error("結果が 0 件");
    expect(result.file).toBe("duet.musicxml");
    const ids = new Set(result.issues.map((i) => i.ruleId));
    expect(ids).toContain("tie-pitch-mismatch");
    expect(ids).toContain("courtesy-accidental");
    expect(ids).toContain("hairpin-target-dynamic");
  });

  it("同じ Score でも設定を変えれば結果が変わる（読み直し不要）", () => {
    const all = lintParsed(parsed, ALL_SETTINGS)[0]!.issues;
    const without = lintParsed(parsed, {
      ...ALL_SETTINGS,
      enabled: { "tie-pitch-mismatch": false },
    })[0]!.issues;
    expect(all.some((i) => i.ruleId === "tie-pitch-mismatch")).toBe(true);
    expect(without.some((i) => i.ruleId === "tie-pitch-mismatch")).toBe(false);
    expect(without.length).toBeLessThan(all.length);
  });

  it("パースに失敗したファイルは結果に含めない", () => {
    const mixed = [
      parseFile("duet.musicxml", duetXml),
      parseFile("bad.xml", new TextEncoder().encode("<html/>")),
    ];
    const results = lintParsed(mixed, ALL_SETTINGS);
    expect(results.map((r) => r.file)).toEqual(["duet.musicxml"]);
  });

  it("同名ファイルが複数あっても index で元の位置を区別できる", () => {
    // 別フォルダから同名の score.musicxml を 2 つ D&D したのを模す。file 名だけでは
    // 2 つを区別できないので、lintParsed が返す index が parsed 配列内の実位置と
    // 一致することを確認する。
    const mixed = [parseFile("score.musicxml", duetXml), parseFile("score.musicxml", duetXml)];
    const results = lintParsed(mixed, ALL_SETTINGS);
    expect(results.map((r) => r.index)).toEqual([0, 1]);
    expect(results.every((r) => r.file === "score.musicxml")).toBe(true);
  });

  it("パース失敗が途中に混ざっても後続ファイルの index はずれない", () => {
    // parsed.filter(...) してから map すると配列長が縮んで index と実位置が
    // 一致しなくなる。ここでは index 0 のパースを意図的に失敗させ、index 1 の
    // 結果が「フィルタ後の 0 番目」ではなく元の index 1 のままであることを確認する。
    const mixed = [
      parseFile("score.musicxml", new TextEncoder().encode("<html/>")), // index 0: 失敗
      parseFile("score.musicxml", duetXml), // index 1: 同名だが成功
    ];
    const results = lintParsed(mixed, ALL_SETTINGS);
    expect(results).toHaveLength(1);
    expect(results[0]?.index).toBe(1);
    expect(results[0]?.file).toBe("score.musicxml");
    expect(results[0]?.issues.some((i) => i.ruleId === "tie-pitch-mismatch")).toBe(true);
  });
});
