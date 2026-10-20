import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ReportedIssue } from "@score-linter/lint-app";
import type { Score } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { EXIT_ERROR, EXIT_ISSUES, EXIT_OK, meetsThreshold, type RunIO, run } from "../src/run.js";

const DUET = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "reader-musicxml",
  "tests",
  "fixtures",
  "duet.musicxml",
);
const duetBytes = readFileSync(DUET);

interface Captured {
  code: number;
  out: string;
  err: string;
}

function invoke(argv: string[], files: Record<string, Uint8Array> = {}): Captured {
  const out: string[] = [];
  const err: string[] = [];
  const io: RunIO = {
    readFile: (path) => {
      const known = files[path];
      if (known) return known;
      if (path === "duet.musicxml") return duetBytes;
      throw new Error(`ENOENT: ${path}`);
    },
    stdout: (t) => out.push(t),
    stderr: (t) => err.push(t),
  };
  return { code: run(argv, io), out: out.join("\n"), err: err.join("\n") };
}

describe("run: 基本動作", () => {
  it("--help は使い方を出して 0 で終わる", () => {
    const r = invoke(["--help"]);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out).toContain("score-lint");
    expect(r.out).toContain("--fail-on");
  });

  it("ファイル未指定はエラー扱い（終了コード 2）", () => {
    const r = invoke([]);
    expect(r.code).toBe(EXIT_ERROR);
    expect(r.err).toContain("ファイルを指定してください");
  });

  it("--list-rules は checker 一覧を出す", () => {
    const r = invoke(["--list-rules"]);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out).toContain("opening-tempo");
    expect(r.out).toContain("pizz-arco");
    expect(r.out.split("\n").length).toBeGreaterThan(20);
  });

  it("読めないファイルは終了コード 2 と理由を返す", () => {
    const r = invoke(["missing.musicxml"]);
    expect(r.code).toBe(EXIT_ERROR);
    expect(r.err).toContain("missing.musicxml");
  });

  it("MusicXML でないファイルはパースエラーを報告する", () => {
    const r = invoke(["bad.xml"], {
      "bad.xml": new TextEncoder().encode("<html/>"),
    });
    expect(r.code).toBe(EXIT_ERROR);
    expect(r.err).toContain("score-partwise");
  });
});

describe("run: 解析結果", () => {
  it("fixture を解析して仕込んだ記譜ミスを検出する", () => {
    const r = invoke(["duet.musicxml"]);
    expect(r.out).toContain("duet.musicxml");
    // Violin II の G3→A3 の異音程タイ
    expect(r.out).toContain("tie-pitch-mismatch");
    // Violin I の m.1 Eb → m.2 E ナチュラル
    expect(r.out).toContain("courtesy-accidental");
    // 到達先の強弱記号が無いクレッシェンド
    expect(r.out).toContain("hairpin-target-dynamic");
    // 既定の --fail-on=error では error が無いので 0
    expect(r.code).toBe(EXIT_OK);
  });

  it("--json は summary と results を持つ JSON を返す", () => {
    const r = invoke(["--json", "duet.musicxml"]);
    const parsed = JSON.parse(r.out) as {
      summary: { files: number; issues: number };
      results: { file: string; issues: ReportedIssue[] }[];
    };
    expect(parsed.summary.files).toBe(1);
    expect(parsed.results[0]?.file).toBe("duet.musicxml");
    expect(parsed.summary.issues).toBe(parsed.results[0]?.issues.length);
  });

  it("--dump-score は読み込んだ楽譜のモデルをそのまま JSON で返す", () => {
    for (const flag of ["--dump-score", "--dump-ir"]) {
      const r = invoke([flag, "duet.musicxml"]);
      expect(r.code).toBe(EXIT_OK);
      const score = JSON.parse(r.out) as Score;
      expect(score.parts.map((p) => p.name)).toEqual(["Violin I", "Violin II"]);
      expect(score.staves[0]?.voices[0]?.events.some((e) => e.type === "chord")).toBe(true);
    }
  });

  it("--format=markdown と --format=csv で表を出す", () => {
    expect(invoke(["--format=markdown", "duet.musicxml"]).out.split("\n")[0]).toBe(
      "| 重大度 | パート | 小節 | メッセージ | ルール |",
    );
    expect(invoke(["--format=csv", "duet.musicxml"]).out.split("\r\n")[0]).toBe(
      '"重大度","パート","小節","メッセージ","ルール"',
    );
  });

  it("--rule で 1 つの checker だけに絞れる", () => {
    const r = invoke(["--json", "--rule=tie-pitch-mismatch", "duet.musicxml"]);
    const parsed = JSON.parse(r.out) as {
      results: { issues: ReportedIssue[] }[];
    };
    const ids = new Set(parsed.results[0]?.issues.map((i) => i.ruleId));
    expect([...ids]).toEqual(["tie-pitch-mismatch"]);
  });

  it("--no-rule で個別に無効化できる", () => {
    const all = JSON.parse(invoke(["--json", "duet.musicxml"]).out) as {
      results: { issues: ReportedIssue[] }[];
    };
    const without = JSON.parse(
      invoke(["--json", "--no-rule=tie-pitch-mismatch", "duet.musicxml"]).out,
    ) as { results: { issues: ReportedIssue[] }[] };
    expect(all.results[0]?.issues.some((i) => i.ruleId === "tie-pitch-mismatch")).toBe(true);
    expect(without.results[0]?.issues.some((i) => i.ruleId === "tie-pitch-mismatch")).toBe(false);
  });

  it("存在しないルール id は終了コード 2", () => {
    const r = invoke(["--rule=nope", "duet.musicxml"]);
    expect(r.code).toBe(EXIT_ERROR);
    expect(r.err).toContain("'nope' は存在しません");
  });
});

describe("run: 終了コードと閾値", () => {
  it("--fail-on=none はつねに 0", () => {
    expect(invoke(["--fail-on=none", "duet.musicxml"]).code).toBe(EXIT_OK);
  });

  it("閾値を下げると warning / info でも 1 になる", () => {
    expect(invoke(["--fail-on=warning", "duet.musicxml"]).code).toBe(EXIT_ISSUES);
    expect(invoke(["--fail-on=info", "duet.musicxml"]).code).toBe(EXIT_ISSUES);
  });

  it("info しか出ない指定なら --fail-on=warning でも 0", () => {
    expect(invoke(["--rule=courtesy-accidental", "duet.musicxml"]).code).toBe(EXIT_OK);
    expect(invoke(["--fail-on=warning", "--rule=courtesy-accidental", "duet.musicxml"]).code).toBe(
      EXIT_OK,
    );
  });

  it("閾値を満たす issue が無ければ 0", () => {
    // info しか出さない checker に絞れば --fail-on=error では 0
    const r = invoke(["--rule=final-barline", "duet.musicxml"]);
    expect(r.code).toBe(EXIT_OK);
  });

  it("ファイルが読めなかった場合は issue の有無に関わらず 2", () => {
    const r = invoke(["--fail-on=none", "duet.musicxml", "missing.xml"]);
    expect(r.code).toBe(EXIT_ERROR);
  });
});

describe("meetsThreshold", () => {
  it("severity の重さで判定する", () => {
    expect(meetsThreshold("warning", "error")).toBe(false);
    expect(meetsThreshold("error", "warning")).toBe(true);
    expect(meetsThreshold("info", "info")).toBe(true);
    expect(meetsThreshold("error", "none")).toBe(false);
  });
});

describe("pretty 出力", () => {
  it("色なしなら ANSI を含まず、位置・ルール・集計を出す", () => {
    const text = invoke(["--no-color", "duet.musicxml"]).out;
    // oxlint-disable-next-line no-control-regex -- ANSI エスケープが無いことの確認
    expect(text).not.toMatch(/\u001b\[/);
    expect(text).toContain("m.2");
    expect(text).toContain("[tie-pitch-mismatch]");
    expect(text).toMatch(/1 ファイル \/ \d+ 件/);
  });

  it("メッセージにパート名を重ねない", () => {
    const line = invoke(["--no-color", "--rule=tie-pitch-mismatch", "duet.musicxml"])
      .out.split("\n")
      .find((l) => l.includes("[tie-pitch-mismatch]"));
    expect(line).toContain("Violin II");
    expect(line?.match(/Violin II/g)).toHaveLength(1);
  });

  it("GitHub のアノテーションはパートと小節をメッセージの頭に置く", () => {
    const out = invoke(["--format=github", "--rule=tie-pitch-mismatch", "duet.musicxml"]).out;
    expect(out).toMatch(
      /^::warning file=duet.musicxml,title=tie-pitch-mismatch::Violin II 2小節目: /,
    );
  });
});
