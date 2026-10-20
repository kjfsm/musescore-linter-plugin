// 性能ベースラインの計測。fixtures/scores/ の実楽譜に対して
// 「MusicXML の読み込み」と「全ルールの実行」を計り、ルール別の内訳を出す。
//
// CI では閾値で落とさない（GitHub runner のブレが大きく偽陽性になるため）。
// 数値を job summary に出すだけにして、回帰の判断は PR 前後の比較で行う。

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { builtinRules, createLinter, type RuleTiming } from "@score-linter/linter";
import { readMusicXmlBytes } from "@score-linter/reader-musicxml";
import type { Score } from "@score-linter/score-model";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SCORES_DIR = path.join(ROOT, "fixtures", "scores");

/** 計測回数。1 回目は JIT のウォームアップとして捨てる。 */
const WARMUP = 1;
const RUNS = 5;

interface Sample {
  name: string;
  bytes: number;
  notes: number;
  issues: number;
  parseMs: number;
  lintMs: number;
  ruleReport: string;
}

function findScores(): string[] {
  if (!fs.existsSync(SCORES_DIR)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(SCORES_DIR, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    // .mscz は MuseScore が無いと読めないので対象外。同じ楽譜の .musicxml が隣にある。
    if (!/\.(musicxml|mxl)$/.test(entry.name)) continue;
    out.push(path.join(entry.parentPath, entry.name));
  }
  return out.sort();
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function countNotes(score: Score): number {
  let n = 0;
  for (const staff of score.staves) for (const voice of staff.voices) n += voice.events.length;
  return n;
}

function ruleReport(timings: RuleTiming[]): string {
  const width = Math.max(0, ...timings.map((t) => t.ruleId.length));
  return timings
    .slice()
    .sort((a, b) => b.ms - a.ms)
    .map((t) => `  ${t.ruleId.padEnd(width)}  ${t.ms.toFixed(2)} ms`)
    .join("\n");
}

function measure(file: string): Sample {
  const bytes = fs.readFileSync(file);

  const parseTimes: number[] = [];
  let score: Score | null = null;
  for (let i = 0; i < WARMUP + RUNS; i++) {
    const t0 = performance.now();
    score = readMusicXmlBytes(bytes).score;
    const elapsed = performance.now() - t0;
    if (i >= WARMUP) parseTimes.push(elapsed);
  }
  if (!score) throw new Error(`楽譜を読めませんでした: ${file}`);

  const lintTimes: number[] = [];
  let issues = 0;
  let timings: RuleTiming[] = [];
  for (let i = 0; i < WARMUP + RUNS; i++) {
    // 問い合わせの結果は Score ごとに覚えられるので、毎回読み直した Score に対して計る
    const fresh = readMusicXmlBytes(bytes).score;
    const linter = createLinter(builtinRules, { now: () => performance.now() });
    const t0 = performance.now();
    const result = linter.lint(fresh);
    const elapsed = performance.now() - t0;
    issues = result.issues.length;
    timings = result.timings;
    if (i >= WARMUP) lintTimes.push(elapsed);
  }

  return {
    name: path.relative(ROOT, file),
    bytes: bytes.length,
    notes: countNotes(score),
    issues,
    parseMs: median(parseTimes),
    lintMs: median(lintTimes),
    ruleReport: ruleReport(timings),
  };
}

function formatMarkdown(samples: Sample[]): string {
  const lines = [
    "## 性能ベースライン",
    "",
    `計測: 各 ${RUNS} 回の中央値（ウォームアップ ${WARMUP} 回を除く）`,
    "",
    "| 楽譜 | サイズ | 音符・休符 | 検出 | 読み込み | lint |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const s of samples) {
    lines.push(
      `| ${s.name} | ${(s.bytes / 1024).toFixed(0)} KB | ${s.notes} | ${s.issues} | ` +
        `${s.parseMs.toFixed(1)} ms | ${s.lintMs.toFixed(1)} ms |`,
    );
  }
  for (const s of samples) {
    if (!s.ruleReport) continue;
    lines.push("", `<details><summary>ルール別内訳: ${s.name}</summary>`, "", "```");
    lines.push(s.ruleReport);
    lines.push("```", "", "</details>");
  }
  return lines.join("\n");
}

function main(): void {
  const files = findScores();
  if (files.length === 0) {
    console.log(`計測対象の楽譜がありません（${path.relative(ROOT, SCORES_DIR)}/）`);
    return;
  }

  const samples = files.map(measure);

  for (const s of samples) {
    console.log(`\n${s.name}`);
    console.log(
      `  ${(s.bytes / 1024).toFixed(0)} KB / ${s.notes} notes / ${s.issues} issues` +
        `  parse ${s.parseMs.toFixed(1)} ms  lint ${s.lintMs.toFixed(1)} ms`,
    );
    if (s.ruleReport) console.log(s.ruleReport);
  }

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) fs.appendFileSync(summaryPath, `${formatMarkdown(samples)}\n`);
}

main();
