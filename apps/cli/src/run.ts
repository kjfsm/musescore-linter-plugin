import {
  createLintApp,
  type FileResult,
  formatResults,
  type LintApp,
} from "@score-linter/lint-app";
import type { Rule, Severity } from "@score-linter/linter";
import { builtinRules, compareSeverity } from "@score-linter/linter";
import { readMusicXmlBytes } from "@score-linter/reader-musicxml";
import type { Score } from "@score-linter/score-model";

import {
  assertKnownRules,
  type CliOptions,
  type FailOn,
  HELP_TEXT,
  parseArgs,
  resolveEnabledRules,
  resolveRuleOptions,
  UsageError,
} from "./args.ts";

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

export function meetsThreshold(severity: Severity, failOn: FailOn): boolean {
  if (failOn === "none") return false;
  return compareSeverity(severity, failOn) <= 0;
}

function listRules(io: RunIO, app: LintApp): number {
  const idWidth = Math.max(0, ...app.ruleInfos.map((r) => r.id.length));
  io.stdout(
    app.ruleInfos
      .map((r) => {
        const { severity, tier, category, name } = r;
        const head = `${r.id.padEnd(idWidth)}  ${severity.padEnd(7)}  ${tier.padEnd(11)}  ${category.padEnd(12)}  ${name}`;
        // オプションの行は id の幅の計算に混ぜず、ぶら下げて出す
        const opts = r.options.map((o) => {
          const values =
            o.type === "boolean"
              ? "true|false"
              : o.type === "select"
                ? o.choices.map((ch) => ch.value).join("|")
                : `${o.choices.map((ch) => ch.value).join("|")}（カンマ区切りで複数可）`;
          const def = Array.isArray(o.default) ? o.default.join(",") : String(o.default);
          return `    --rule-option=${r.id}.${o.key}=<${values}>  ${o.label}（既定: ${def || "なし"}）`;
        });
        return [head, ...opts].join("\n");
      })
      .join("\n"),
  );
  return EXIT_OK;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function render(results: FileResult[], options: CliOptions): string {
  return formatResults(results, options.format === "pretty" ? "text" : options.format, {
    color: options.color,
  });
}

/** `rules` はテストで差し替えるための引数。 */
export function run(argv: string[], io: RunIO, rules: readonly Rule[] = builtinRules): number {
  let options: CliOptions;
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
  const app = createLintApp(rules);
  if (options.listRules) return listRules(io, app);

  if (options.files.length === 0) {
    io.stderr(`解析するファイルを指定してください\n\n${HELP_TEXT}`);
    return EXIT_ERROR;
  }

  const allRuleIds = app.rules.map((r) => r.id);
  let ruleOptions: ReturnType<typeof resolveRuleOptions>;
  try {
    assertKnownRules(options, allRuleIds);
    ruleOptions = resolveRuleOptions(options, app.rules);
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr(describeError(error));
      return EXIT_ERROR;
    }
    throw error;
  }
  const settings = app.normalizeSettings({
    preset: options.preset,
    enabled: resolveEnabledRules(options, allRuleIds),
    options: ruleOptions,
  });

  const results: FileResult[] = [];
  const scores: { file: string; score: Score }[] = [];
  let failed = false;

  for (const file of options.files) {
    try {
      const { score } = readMusicXmlBytes(io.readFile(file));
      if (options.dumpScore) {
        scores.push({ file, score });
        continue;
      }
      results.push({ file, issues: app.lint(score, settings).issues });
    } catch (error) {
      failed = true;
      io.stderr(`${file}: ${describeError(error)}`);
    }
  }

  if (options.dumpScore) {
    io.stdout(JSON.stringify(scores.length === 1 ? scores[0]!.score : scores, null, 2));
    return failed ? EXIT_ERROR : EXIT_OK;
  }

  io.stdout(render(results, options));

  if (failed) return EXIT_ERROR;
  const hasBlocking = results.some((r) =>
    r.issues.some((i) => meetsThreshold(i.severity, options.failOn)),
  );
  return hasBlocking ? EXIT_ISSUES : EXIT_OK;
}
