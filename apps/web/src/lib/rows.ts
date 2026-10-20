import {
  countBySeverity,
  type FileResult,
  formatCsv,
  formatMarkdown,
  type ReportedIssue,
} from "@score-linter/lint-app";
import type { Severity } from "@score-linter/linter";

import type { LintedFile } from "./lint";

export interface Row {
  key: string;
  measureLabel: string;
  severity: Severity;
  partName: string;
  message: string;
  ruleId: string;
}

export function toRows(issues: ReportedIssue[]): Row[] {
  return issues.map((issue, i) => ({
    // ruleId と位置だけでは、同じ小節の同じ種類の指摘が衝突する
    key: `${issue.ruleId}:${issue.staffIdx}:${issue.tick}:${i}`,
    measureLabel: issue.measureLabel,
    severity: issue.severity,
    partName: issue.partName,
    message: issue.message,
    ruleId: issue.ruleId,
  }));
}

export function summarize(results: LintedFile[]): Record<Severity, number> {
  return countBySeverity(results.reduce<ReportedIssue[]>((acc, r) => acc.concat(r.issues), []));
}

export type ExportFormat = "markdown" | "csv";

export function exportResults(
  results: LintedFile[],
  format: ExportFormat,
): { text: string; mimeType: string; extension: string } {
  const files: FileResult[] = results.map(({ file, issues }) => ({ file, issues }));
  return format === "csv"
    ? // Excel が UTF-8 と判断できるよう BOM を付ける
      { text: `﻿${formatCsv(files)}`, mimeType: "text/csv", extension: "csv" }
    : { text: formatMarkdown(files), mimeType: "text/markdown", extension: "md" };
}
