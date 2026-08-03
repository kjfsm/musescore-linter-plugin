// 性能ベースラインの計測。fixtures/scores/ の実楽譜に対して
// 「MusicXML のパース」と「全 checker の実行」を計り、checker 別の内訳を出す。
//
// CI では閾値で落とさない（GitHub runner のブレが大きく偽陽性になるため）。
// 数値を job summary に出すだけにして、回帰の判断は PR 前後の比較で行う。

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { registerAll } from "@musescore-linter/checkers";
import {
  getCheckerPerfReport,
  type LintIR,
  runAllCheckers,
  setPerfEnabled,
} from "@musescore-linter/core";
import { buildIRFromBytes } from "@musescore-linter/source-musicxml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SCORES_DIR = path.join(ROOT, "fixtures", "scores");

/** 計測回数。1 回目は JIT のウォームアップとして捨てる。 */
const WARMUP = 1;
const RUNS = 5;

interface Sample {
  name: string;
  bytes: number;
  events: number;
  issues: number;
  parseMs: number;
  lintMs: number;
  checkerReport: string;
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
  return sorted[Math.floor(sorted.length / 2)];
}

function measure(file: string): Sample {
  const bytes = fs.readFileSync(file);

  const parseTimes: number[] = [];
  let ir: LintIR | null = null;
  for (let i = 0; i < WARMUP + RUNS; i++) {
    const t0 = performance.now();
    ir = buildIRFromBytes(bytes);
    const elapsed = performance.now() - t0;
    if (i >= WARMUP) parseTimes.push(elapsed);
  }
  if (!ir) throw new Error(`IR を構築できませんでした: ${file}`);

  const lintTimes: number[] = [];
  let issues = 0;
  for (let i = 0; i < WARMUP + RUNS; i++) {
    // derived は runAllCheckers 内で構築されるが、2 回目以降はキャッシュが効いて
    // しまうので、毎回作り直した IR に対して計る。
    const fresh = buildIRFromBytes(bytes);
    const t0 = performance.now();
    issues = runAllCheckers(fresh).length;
    const elapsed = performance.now() - t0;
    if (i >= WARMUP) lintTimes.push(elapsed);
  }

  // checker 別の内訳は最後の 1 回ぶんを採る（Perf は ms 精度なので合算しない）。
  const fresh = buildIRFromBytes(bytes);
  runAllCheckers(fresh);

  return {
    name: path.relative(ROOT, file),
    bytes: bytes.length,
    events: ir.events.length,
    issues,
    parseMs: median(parseTimes),
    lintMs: median(lintTimes),
    checkerReport: getCheckerPerfReport(),
  };
}

function formatMarkdown(samples: Sample[]): string {
  const lines = [
    "## 性能ベースライン",
    "",
    `計測: 各 ${RUNS} 回の中央値（ウォームアップ ${WARMUP} 回を除く）`,
    "",
    "| 楽譜 | サイズ | イベント数 | 検出 | パース | lint |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const s of samples) {
    lines.push(
      `| ${s.name} | ${(s.bytes / 1024).toFixed(0)} KB | ${s.events} | ${s.issues} | ` +
        `${s.parseMs.toFixed(1)} ms | ${s.lintMs.toFixed(1)} ms |`,
    );
  }
  for (const s of samples) {
    if (!s.checkerReport) continue;
    lines.push("", `<details><summary>checker 別内訳: ${s.name}</summary>`, "", "```");
    lines.push(s.checkerReport);
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

  registerAll();
  setPerfEnabled(true);

  const samples = files.map(measure);

  for (const s of samples) {
    console.log(`\n${s.name}`);
    console.log(
      `  ${(s.bytes / 1024).toFixed(0)} KB / ${s.events} events / ${s.issues} issues` +
        `  parse ${s.parseMs.toFixed(1)} ms  lint ${s.lintMs.toFixed(1)} ms`,
    );
    if (s.checkerReport) console.log(s.checkerReport);
  }

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) fs.appendFileSync(summaryPath, `${formatMarkdown(samples)}\n`);
}

main();
