import {
  createLintApp,
  type FileResult,
  formatCsv,
  formatMarkdown,
  formatText,
  type HostDiagnostic,
  type ReportedIssue,
  type Settings,
} from "@score-linter/lint-app";
import type { RuleTiming, Severity } from "@score-linter/linter";
import { builtinRules } from "@score-linter/linter";
import type { MuseScore } from "@score-linter/musescore-api-types";
import { connect } from "@score-linter/musescore-plugin-helpers";
import { type MuseScoreOrigins, readMuseScore } from "@score-linter/reader-musescore";
import type { Score } from "@score-linter/score-model";

export const app = createLintApp(builtinRules);

/** QML が保持して、スナップショット・ジャンプ・コピーに使う 1 回分の結果。 */
export interface LintRun {
  /** 版の食い違いと読めなかった小節の警告も、指摘として同じ順・同じ数え方に入る。 */
  issues: ReportedIssue[];
  counts: Record<Severity, number>;
  /** パートの絞り込みに出すパート。同じ名前のパートも別に並ぶ。 */
  parts: { id: string; name: string }[];
  /** 計測を頼まれたときだけ埋まる。 */
  perfText: string;
  score: Score;
  origins: MuseScoreOrigins;
}

function perfReport(readMs: number, timings: RuleTiming[]): string {
  const rows: [string, number][] = [
    ["readMuseScore", readMs],
    ...timings.map((t): [string, number] => [t.ruleId, t.ms]),
  ];
  const width = Math.max(0, ...rows.map(([label]) => label.length));
  return [
    "[ScoreLinter:lint]",
    ...rows.map(([label, ms]) => `  ${label}${" ".repeat(width - label.length)}  ${ms} ms`),
  ].join("\n");
}

/**
 * `host` は QML の `MuseScore { }` のルートオブジェクト。時刻は Date.now() — QML のエンジンには
 * performance.now() が無い。
 */
export function lintCurrentScore(host: MuseScore, settings: Settings, measure: boolean): LintRun {
  const helpers = connect(host);
  const msScore = host.curScore;
  if (!msScore) throw new Error("スコアが開かれていません");

  const started = Date.now();
  const { score, origins, unreadMeasures } = readMuseScore(helpers, msScore);
  const readMs = Date.now() - started;

  const version = helpers.checkVersion();
  const diagnostics: HostDiagnostic[] = [];
  if (!version.ok) {
    diagnostics.push({ id: "internal-version-mismatch", message: version.message, measure: 0 });
  }
  for (const serial of unreadMeasures) {
    diagnostics.push({
      id: "internal-unread-measure",
      message: "この小節は読み取りの途中で失敗しました。指摘が欠けている可能性があります",
      measure: serial,
    });
  }
  const { issues, counts, timings } = app.lint(score, settings, {
    diagnostics,
    ...(measure ? { now: () => Date.now() } : {}),
  });

  return {
    issues,
    counts,
    parts: score.parts.map((p) => ({ id: p.id, name: p.name })),
    perfText: measure ? perfReport(readMs, timings) : "",
    score,
    origins,
  };
}

/** 指摘の小節を範囲選択するための tick と譜表。小節を持たない指摘では null。 */
export function selectionFor(
  run: LintRun,
  issue: ReportedIssue,
): { startTick: number; endTick: number; staff: number } | null {
  const origin = run.origins.measures[issue.measure - 1];
  if (!origin) return null;
  return {
    startTick: origin.firstSegmentTick,
    endTick: origin.lastSegmentTick + 1,
    staff: issue.staffIdx >= 0 ? issue.staffIdx : 0,
  };
}

export type CopyFormat = "text" | "markdown" | "csv";

export function formatForCopy(issues: ReportedIssue[], format: CopyFormat): string {
  if (issues.length === 0) return "";
  const results: FileResult[] = [{ file: "", issues }];
  if (format === "markdown") return formatMarkdown(results);
  if (format === "csv") return formatCsv(results);
  return formatText(results);
}
