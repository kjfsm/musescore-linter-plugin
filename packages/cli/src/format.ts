import type { Issue, Severity } from "@musescore-linter/core";

import type { FailOn } from "./args.js";

export interface FileResult {
  file: string;
  issues: Issue[];
}

const SEVERITY_RANK: Record<Severity, number> = {
  error: 3,
  warning: 2,
  info: 1,
};

/** issue が `failOn` の閾値以上か。 */
export function meetsThreshold(severity: Severity, failOn: FailOn): boolean {
  if (failOn === "none") return false;
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[failOn];
}

const ANSI: Record<Severity | "dim" | "bold" | "reset", string> = {
  error: "[31m",
  warning: "[33m",
  info: "[36m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

function paint(text: string, code: string, color: boolean): string {
  return color ? `${code}${text}${ANSI.reset}` : text;
}

const SEVERITY_LABEL: Record<Severity, string> = {
  error: "error  ",
  warning: "warning",
  info: "info   ",
};

function padEnd(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

/**
 * checker のメッセージは QML の一行表示向けに `"<パート名>: ..."` で始まるものが多い。
 * pretty 出力はパート名を独立した列に出すので、重複する接頭辞だけ取り除く。
 */
export function stripPartPrefix(issue: Issue): string {
  const prefix = `${issue.partName}: `;
  return issue.partName !== "" && issue.message.startsWith(prefix)
    ? issue.message.slice(prefix.length)
    : issue.message;
}

export function countBySeverity(issues: Issue[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity]++;
  return counts;
}

export function formatPretty(results: FileResult[], color: boolean): string {
  const lines: string[] = [];
  const all: Issue[] = [];

  for (const result of results) {
    all.push(...result.issues);
    lines.push(paint(result.file, ANSI.bold, color));
    if (result.issues.length === 0) {
      lines.push(`  ${paint("問題は見つかりませんでした", ANSI.dim, color)}`);
      lines.push("");
      continue;
    }

    const partWidth = Math.max(...result.issues.map((i) => i.partName.length), 0);
    for (const issue of result.issues) {
      const where = issue.measure > 0 ? `m.${issue.measure}` : "-";
      lines.push(
        [
          " ",
          padEnd(where, 6),
          paint(SEVERITY_LABEL[issue.severity], ANSI[issue.severity], color),
          padEnd(issue.partName, partWidth),
          stripPartPrefix(issue),
          paint(`[${issue.ruleId}]`, ANSI.dim, color),
        ].join(" "),
      );
    }
    lines.push("");
  }

  const counts = countBySeverity(all);
  const fileWord = `${results.length} ファイル`;
  if (all.length === 0) {
    lines.push(`${fileWord} / 問題なし`);
  } else {
    lines.push(
      `${fileWord} / ${all.length} 件（error ${counts.error}, warning ${counts.warning}, info ${counts.info}）`,
    );
  }
  return lines.join("\n");
}

const GITHUB_LEVEL: Record<Severity, string> = {
  error: "error",
  warning: "warning",
  info: "notice",
};

/** GitHub Actions のワークフローコマンドで使えないように文字をエスケープする。 */
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
 * GitHub Actions のアノテーション形式。
 *
 * LintIR は小節番号までしか持たず MusicXML の行番号を追跡していないため `line=` は付けない
 * （アノテーションはファイル単位で表示される）。checker のメッセージ自体がパート名と
 * 小節番号を含んでいるので、位置情報を重ねて付けることもしない。
 */
export function formatGithub(results: FileResult[]): string {
  const lines: string[] = [];
  for (const result of results) {
    for (const issue of result.issues) {
      lines.push(
        `::${GITHUB_LEVEL[issue.severity]} file=${escapeProperty(result.file)},title=${escapeProperty(issue.ruleId)}::${escapeData(issue.message)}`,
      );
    }
  }
  return lines.join("\n");
}

export function formatJson(results: FileResult[]): string {
  const all = results.flatMap((r) => r.issues);
  return JSON.stringify(
    {
      summary: {
        files: results.length,
        issues: all.length,
        ...countBySeverity(all),
      },
      results,
    },
    null,
    2,
  );
}
