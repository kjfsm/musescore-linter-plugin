import {
  countBySeverity,
  type FileResult,
  formatCsv,
  formatMarkdown,
  formatText,
  presentIssues,
  type ReportedIssue,
  ruleGroups,
  type RuleGroup,
  ruleOptionValues,
  type Settings,
  toLinterConfig,
} from "@score-linter/lint-app";
import type { OptionValue, Severity } from "@score-linter/linter";
import { builtinRules, createLinter } from "@score-linter/linter";
import type { MuseScore } from "@score-linter/musescore-api-types";
import { connect } from "@score-linter/musescore-plugin-helpers";
import { type MuseScoreOrigins, readMuseScore } from "@score-linter/reader-musescore";
import type { Score } from "@score-linter/score-model";

export const rules = builtinRules;

export function ruleCatalog(): RuleGroup[] {
  return ruleGroups(rules);
}

/** 設定画面のチェックボックスとオプションに出す値。どのルールも既定値で埋める。 */
export function settingsView(settings: Settings): {
  enabled: Record<string, boolean>;
  options: Record<string, Record<string, OptionValue>>;
} {
  const enabled: Record<string, boolean> = {};
  const options: Record<string, Record<string, OptionValue>> = {};
  for (const rule of rules) {
    enabled[rule.id] = settings.enabled[rule.id] ?? rule.meta.defaultEnabled;
    options[rule.id] = ruleOptionValues(rule, settings);
  }
  return { enabled, options };
}

/** QML が保持して、スナップショット・ジャンプ・コピーに使う 1 回分の結果。 */
export interface LintRun {
  issues: ReportedIssue[];
  counts: Record<Severity, number>;
  /** パートの絞り込みに出す名前。楽譜の並び順、重複なし。 */
  partNames: string[];
  /** 型の生成元と実行中の MuseScore の版が食い違うときの警告。 */
  warning: string | null;
  /** 計測を頼まれたときだけ埋まる。 */
  perfText: string;
  score: Score;
  origins: MuseScoreOrigins;
}

function perfReport(readMs: number, timings: { ruleId: string; ms: number }[]): string {
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
  const { score, origins } = readMuseScore(helpers, msScore);
  const readMs = Date.now() - started;

  const linter = createLinter(rules, measure ? { now: () => Date.now() } : {});
  const result = linter.lint(score, toLinterConfig(settings));
  const issues = presentIssues(score, result.issues);
  const version = helpers.checkVersion();

  const partNames: string[] = [];
  for (const part of score.parts)
    if (partNames.indexOf(part.name) === -1) partNames.push(part.name);

  return {
    issues,
    counts: countBySeverity(issues),
    partNames,
    warning: version.ok ? null : version.message,
    perfText: measure ? perfReport(readMs, result.timings) : "",
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
