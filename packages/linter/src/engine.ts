import type { Score } from "@score-linter/score-model";
import { partOfStaff } from "@score-linter/score-model";

import { resolveOptions } from "./options.ts";
import { compareSeverity } from "./severity.ts";
import type { Issue, OptionSpecs, Preset, Report, Rule, RuleTier } from "./types.ts";

/** オプションの宣言を `S` に保ったまま Rule を作る。型引数を書かずに済ませるための入口。 */
export function defineRule<const S extends OptionSpecs = Record<never, never>>(
  rule: Rule<S>,
): Rule<S> {
  return rule;
}

export interface LinterConfig {
  /** 書かれていないルールの ON/OFF を段階から決める。省略すると `recommended`。 */
  preset?: Preset;
  /** ルール id → 有効か。書かれていないルールは {@link isEnabledByDefault} に従う。 */
  enabled?: Readonly<Record<string, boolean>>;
  /** ルール id → オプションの生の値。エンジンが宣言に沿って正規化してから渡す。 */
  options?: Readonly<Record<string, unknown>>;
}

export interface RuleTiming {
  ruleId: string;
  ms: number;
}

export interface LintResult {
  /** ルールの順、ルールの中では報告した順。並べ替えは lint-app が行う。 */
  issues: Issue[];
  /** `createLinter` に時計を渡したときだけ埋まる。 */
  timings: RuleTiming[];
}

export interface LinterOptions {
  /** ミリ秒を返す時計。QML のエンジンには performance.now() が無いので、ホストが渡す。 */
  now?: () => number;
}

export interface Linter {
  readonly rules: readonly Rule[];
  lint(score: Score, config?: LinterConfig): LintResult;
}

export function isEnabledByDefault(tier: RuleTier, preset: Preset): boolean {
  return tier === "recommended" || (tier === "pedantic" && preset === "all");
}

export function isRuleEnabled(rule: Rule, config: LinterConfig = {}): boolean {
  return (
    config.enabled?.[rule.id] ?? isEnabledByDefault(rule.meta.tier, config.preset ?? "recommended")
  );
}

function issueFrom(score: Score, rule: Rule, report: Report): Issue {
  const severity = report.severity ?? rule.meta.severity;
  if (compareSeverity(severity, rule.meta.severity) < 0) {
    throw new Error(
      `meta.severity（${rule.meta.severity}）より重い ${severity} を報告しました。meta.severity を直してください`,
    );
  }
  const staff = report.at.staff;
  return {
    ruleId: rule.id,
    severity,
    category: rule.meta.category,
    message: report.message,
    at: {
      partId: staff === undefined ? null : (partOfStaff(score, staff)?.id ?? null),
      staff: staff ?? null,
      measure: report.at.measure,
      tick: report.at.tick,
    },
    detail: report.detail ?? null,
  };
}

/**
 * ルールの一覧からリンターを作る。登録表をモジュールに持たないので、
 * テストごとに別の組み合わせを並行して作れる。
 */
export function createLinter(rules: readonly Rule[], options: LinterOptions = {}): Linter {
  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.id)) throw new Error(`ルール id '${rule.id}' が重複しています`);
    seen.add(rule.id);
  }
  const { now } = options;

  return {
    rules,
    lint(score, config = {}) {
      const issues: Issue[] = [];
      const timings: RuleTiming[] = [];
      for (const rule of rules) {
        if (!isRuleEnabled(rule, config)) continue;
        const found: Issue[] = [];
        const started = now?.();
        try {
          rule.run({
            score,
            options: resolveOptions(rule.options, config.options?.[rule.id]),
            report: (report) => found.push(issueFrom(score, rule, report)),
          });
          issues.push(...found);
        } catch (error) {
          // 1 つのルールの不具合で他のルールの結果まで失わないよう、内部エラーの指摘にして続ける
          issues.push({
            ruleId: "internal",
            severity: "error",
            category: "internal",
            message: `ルール '${rule.id}' の実行中にエラー: ${error}`,
            at: { partId: null, staff: null, measure: 0, tick: 0 },
            detail: null,
          });
        }
        if (now && started !== undefined) timings.push({ ruleId: rule.id, ms: now() - started });
      }
      return { issues, timings };
    },
  };
}
