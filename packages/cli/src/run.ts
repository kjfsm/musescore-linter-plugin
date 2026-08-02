import { registerAll } from "@musescore-linter/checkers";
import type { LintIR } from "@musescore-linter/core";
import { getCheckerList, reset, runAllCheckers, setLevel } from "@musescore-linter/core";
import { buildIRFromBytes } from "@musescore-linter/source-musicxml";

import { assertKnownRules, HELP_TEXT, parseArgs, resolveEnabledRules, UsageError } from "./args.js";
import {
  type FileResult,
  formatGithub,
  formatJson,
  formatPretty,
  meetsThreshold,
} from "./format.js";

export const EXIT_OK = 0;
export const EXIT_ISSUES = 1;
export const EXIT_ERROR = 2;

export interface RunIO {
  readFile(path: string): Uint8Array;
  stdout(text: string): void;
  stderr(text: string): void;
}

declare const __CLI_VERSION__: string | undefined;
const VERSION = typeof __CLI_VERSION__ === "string" ? __CLI_VERSION__ : "dev";

function registerCheckers(): void {
  // checker レジストリはモジュールレベルの配列なので、多重登録を避けて毎回作り直す
  reset();
  registerAll();
}

function listRules(io: RunIO): number {
  registerCheckers();
  const rows = getCheckerList().map((c) => ({
    id: c.id,
    severity: c.severity,
    category: c.category,
    name: c.name,
    defaultEnabled: c.defaultEnabled,
  }));
  const idWidth = Math.max(...rows.map((r) => r.id.length));
  io.stdout(
    rows
      .map(
        (r) =>
          `${r.id.padEnd(idWidth)}  ${r.severity.padEnd(7)}  ${r.category.padEnd(12)}  ${r.name}${r.defaultEnabled ? "" : "（既定で無効）"}`,
      )
      .join("\n"),
  );
  return EXIT_OK;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function run(argv: string[], io: RunIO): number {
  let options: ReturnType<typeof parseArgs>;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr(`${describeError(error)}\n\n${HELP_TEXT}`);
      return EXIT_ERROR;
    }
    throw error;
  }

  if (options.help) {
    io.stdout(HELP_TEXT);
    return EXIT_OK;
  }
  if (options.version) {
    io.stdout(VERSION);
    return EXIT_OK;
  }
  if (options.listRules) return listRules(io);

  if (options.files.length === 0) {
    io.stderr(`解析するファイルを指定してください\n\n${HELP_TEXT}`);
    return EXIT_ERROR;
  }

  // checker ごとの検出件数ログは CLI の出力を汚すので既定では出さない
  setLevel("warn");
  registerCheckers();

  const allRuleIds = getCheckerList().map((c) => c.id);
  try {
    assertKnownRules(options, allRuleIds);
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr(describeError(error));
      return EXIT_ERROR;
    }
    throw error;
  }
  const enabledRules = resolveEnabledRules(options, allRuleIds);

  const results: FileResult[] = [];
  const irs: { file: string; ir: LintIR }[] = [];
  let failed = false;

  for (const file of options.files) {
    try {
      const ir = buildIRFromBytes(io.readFile(file));
      if (options.dumpIR) {
        irs.push({ file, ir });
        continue;
      }
      results.push({ file, issues: runAllCheckers(ir, enabledRules) });
    } catch (error) {
      failed = true;
      io.stderr(`${file}: ${describeError(error)}`);
    }
  }

  if (options.dumpIR) {
    io.stdout(JSON.stringify(irs.length === 1 ? irs[0].ir : irs, null, 2));
    return failed ? EXIT_ERROR : EXIT_OK;
  }

  io.stdout(renderResults(results, options));

  if (failed) return EXIT_ERROR;
  const hasBlocking = results.some((r) =>
    r.issues.some((i) => meetsThreshold(i.severity, options.failOn)),
  );
  return hasBlocking ? EXIT_ISSUES : EXIT_OK;
}

function renderResults(results: FileResult[], options: ReturnType<typeof parseArgs>): string {
  switch (options.format) {
    case "json":
      return formatJson(results);
    case "github":
      return formatGithub(results);
    default:
      return formatPretty(results, options.color);
  }
}
