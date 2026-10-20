import type { Issue, Severity } from "@score-linter/linter";
import type { Score } from "@score-linter/score-model";
import { measureBySerial, partOfStaff, stableSortBy } from "@score-linter/score-model";

/**
 * 表示する指摘 1 件。どのホストもこの形を受け取って並べるだけにする。
 * `measure` は通し番号、`measureLabel` は楽譜に表示されている番号。
 */
export interface ReportedIssue {
  ruleId: string;
  severity: Severity;
  category: string;
  message: string;
  partId: string | null;
  /** 楽譜全体に対する指摘では空文字列。 */
  partName: string;
  /** 楽譜全体に対する指摘では -1。 */
  staffIdx: number;
  measure: number;
  /** 小節を持たない指摘（内部エラーなど）では空文字列。 */
  measureLabel: string;
  tick: number;
  detail: Record<string, unknown> | null;
}

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** 小節 → 譜表（楽譜全体の指摘が先）→ 重い順 → tick。同じなら報告された順。 */
export function compareIssues(a: ReportedIssue, b: ReportedIssue): number {
  return (
    a.measure - b.measure ||
    a.staffIdx - b.staffIdx ||
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    a.tick - b.tick
  );
}

const labelOf = (score: Score, serial: number): string =>
  measureBySerial(score, serial)?.label ?? (serial > 0 ? String(serial) : "");

export function measureText(label: string): string {
  return `${label}小節目`;
}

/**
 * メッセージの中の位置のプレースホルダを、表示用の文字に置き換える。ルールはパート名や
 * 小節番号を知らないまま、detail の値を指してメッセージを書ける。
 * - `{{measure:key}}` → detail[key] の通し番号が指す小節（「12小節目」）
 * - `{{part:key}}` → detail[key] の譜表が属するパート名
 */
function resolveMessage(score: Score, issue: Issue): string {
  return issue.message.replace(
    /\{\{(measure|part):(\w+)\}\}/g,
    (whole, kind: string, key: string) => {
      const value = issue.detail?.[key];
      if (typeof value !== "number") return whole;
      if (kind === "measure") return measureText(labelOf(score, value));
      return partOfStaff(score, value)?.name ?? `Staff ${value + 1}`;
    },
  );
}

/** linter の指摘に表示の情報を付け、どのホストでも同じ順に並べる。 */
export function presentIssues(score: Score, issues: readonly Issue[]): ReportedIssue[] {
  const reported = issues.map((issue): ReportedIssue => {
    const staff = issue.at.staff;
    return {
      ruleId: issue.ruleId,
      severity: issue.severity,
      category: issue.category,
      message: resolveMessage(score, issue),
      partId: issue.at.partId,
      partName: staff === null ? "" : (partOfStaff(score, staff)?.name ?? `Staff ${staff + 1}`),
      staffIdx: staff ?? -1,
      measure: issue.at.measure,
      measureLabel: issue.at.measure > 0 ? labelOf(score, issue.at.measure) : "",
      tick: issue.at.tick,
      detail: issue.detail,
    };
  });
  return stableSortBy(reported, compareIssues);
}

export function countBySeverity(
  issues: readonly { severity: Severity }[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity]++;
  return counts;
}
