import type { Severity } from "@score-linter/linter";

import { countBySeverity, measureText, type ReportedIssue } from "./report.ts";

export interface FileResult {
  file: string;
  issues: ReportedIssue[];
}

function padEnd(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

const ANSI: Record<Severity | "dim" | "bold" | "reset", string> = {
  error: "\u001b[31m",
  warning: "\u001b[33m",
  info: "\u001b[36m",
  dim: "\u001b[2m",
  bold: "\u001b[1m",
  reset: "\u001b[0m",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  error: "error  ",
  warning: "warning",
  info: "info   ",
};

/** 「Violin I 12小節目」。楽譜全体の指摘や小節を持たない指摘では、ある分だけ。 */
export function locationText(issue: ReportedIssue): string {
  const where = issue.measureLabel ? measureText(issue.measureLabel) : "";
  return [issue.partName, where].filter((s) => s !== "").join(" ");
}

/** 人が読む一覧。`file` が空のファイルは見出しを出さない（ホストが楽譜を 1 つだけ扱うとき）。 */
export function formatText(
  results: readonly FileResult[],
  options: { color?: boolean } = {},
): string {
  const color = options.color ?? false;
  const paint = (text: string, code: string) => (color ? `${code}${text}${ANSI.reset}` : text);
  const lines: string[] = [];
  const all: ReportedIssue[] = [];

  for (const result of results) {
    all.push(...result.issues);
    const indent = result.file === "" ? "" : "  ";
    if (result.file !== "") lines.push(paint(result.file, ANSI.bold));
    if (result.issues.length === 0) {
      lines.push(`${indent}${paint("問題は見つかりませんでした", ANSI.dim)}`);
      if (result.file !== "") lines.push("");
      continue;
    }
    const partWidth = Math.max(0, ...result.issues.map((i) => i.partName.length));
    for (const issue of result.issues) {
      const where = issue.measureLabel ? `m.${issue.measureLabel}` : "-";
      lines.push(
        [
          indent,
          padEnd(where, 6),
          paint(SEVERITY_LABEL[issue.severity], ANSI[issue.severity]),
          padEnd(issue.partName, partWidth),
          issue.message,
          paint(`[${issue.ruleId}]`, ANSI.dim),
        ].join(" "),
      );
    }
    if (result.file !== "") lines.push("");
  }

  if (results.length > 1 || results.some((r) => r.file !== "")) {
    const counts = countBySeverity(all);
    const fileWord = `${results.length} ファイル`;
    lines.push(
      all.length === 0
        ? `${fileWord} / 問題なし`
        : `${fileWord} / ${all.length} 件（error ${counts.error}, warning ${counts.warning}, info ${counts.info}）`,
    );
  }
  return lines.join("\n");
}

export function formatJson(results: readonly FileResult[]): string {
  const all = results.reduce<ReportedIssue[]>((acc, r) => acc.concat(r.issues), []);
  return JSON.stringify(
    { summary: { files: results.length, issues: all.length, ...countBySeverity(all) }, results },
    null,
    2,
  );
}

const GITHUB_LEVEL: Record<Severity, string> = {
  error: "error",
  warning: "warning",
  info: "notice",
};

// GitHub Actions のワークフローコマンドの仕様で、プロパティとデータで逃がす文字が違う
function escapeProperty(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/**
 * GitHub Actions のアノテーション。楽譜には行番号が無いので `line=` は付けず、
 * パートと小節をメッセージの頭に置く。
 */
export function formatGithub(results: readonly FileResult[]): string {
  const lines: string[] = [];
  for (const result of results) {
    for (const issue of result.issues) {
      const where = locationText(issue);
      const message = where ? `${where}: ${issue.message}` : issue.message;
      lines.push(
        `::${GITHUB_LEVEL[issue.severity]} file=${escapeProperty(result.file)},title=${escapeProperty(issue.ruleId)}::${escapeData(message)}`,
      );
    }
  }
  return lines.join("\n");
}

interface Column {
  header: string;
  value: (issue: ReportedIssue, file: string) => string;
}

function columnsFor(results: readonly FileResult[]): Column[] {
  const columns: Column[] = [
    { header: "重大度", value: (i) => i.severity.toUpperCase() },
    { header: "パート", value: (i) => i.partName },
    { header: "小節", value: (i) => i.measureLabel },
    { header: "メッセージ", value: (i) => i.message },
    { header: "ルール", value: (i) => i.ruleId },
  ];
  return results.length > 1 ? [{ header: "ファイル", value: (_, f) => f }, ...columns] : columns;
}

export function formatMarkdown(results: readonly FileResult[]): string {
  const columns = columnsFor(results);
  const row = (cells: string[]) => `| ${cells.join(" | ")} |`;
  const lines = [row(columns.map((c) => c.header)), row(columns.map(() => "---"))];
  for (const result of results) {
    for (const issue of result.issues) {
      lines.push(
        row(
          columns.map((c) => {
            const text = c.value(issue, result.file).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
            return text === "" ? "-" : text;
          }),
        ),
      );
    }
  }
  return lines.join("\n");
}

/** RFC 4180 の CSV。表計算ソフトで開けるよう、すべての値を引用符で囲む。 */
export function formatCsv(results: readonly FileResult[]): string {
  const columns = columnsFor(results);
  const quote = (text: string) => `"${text.replace(/"/g, '""')}"`;
  const lines = [columns.map((c) => quote(c.header)).join(",")];
  for (const result of results) {
    for (const issue of result.issues) {
      lines.push(columns.map((c) => quote(c.value(issue, result.file))).join(","));
    }
  }
  return lines.join("\r\n");
}

export type OutputFormat = "text" | "json" | "github" | "markdown" | "csv";

export function formatResults(
  results: readonly FileResult[],
  format: OutputFormat,
  options: { color?: boolean } = {},
): string {
  switch (format) {
    case "json":
      return formatJson(results);
    case "github":
      return formatGithub(results);
    case "markdown":
      return formatMarkdown(results);
    case "csv":
      return formatCsv(results);
    default:
      return formatText(results, options);
  }
}
