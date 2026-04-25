import type { Checker, Issue, Severity } from "./types.js";

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

function severityRank(sev: Severity): number {
  return SEVERITY_ORDER[sev] ?? 99;
}

export interface IssueFields {
  severity?: Severity;
  message?: string;
  partName?: string;
  staffIdx?: number;
  measure?: number;
  tick?: number;
  detail?: Record<string, unknown> | null;
}

export function createIssue(checker: Checker, fields: IssueFields = {}): Issue {
  return {
    ruleId: checker.id,
    severity: fields.severity ?? checker.severity,
    category: checker.category,
    message: fields.message ?? "",
    partName: fields.partName ?? "",
    staffIdx: fields.staffIdx ?? -1,
    measure: fields.measure ?? 0,
    tick: fields.tick ?? 0,
    detail: fields.detail ?? null,
  };
}

export function compareIssues(a: Issue, b: Issue): number {
  if (a.measure !== b.measure) return a.measure - b.measure;
  if (a.staffIdx !== b.staffIdx) return a.staffIdx - b.staffIdx;
  const av = severityRank(a.severity);
  const bv = severityRank(b.severity);
  if (av !== bv) return av - bv;
  return (a.tick ?? 0) - (b.tick ?? 0);
}
