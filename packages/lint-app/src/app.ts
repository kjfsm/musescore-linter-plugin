import type { Issue, Rule, RuleTiming, Severity } from "@score-linter/linter";
import { createLinter } from "@score-linter/linter";
import type { Score } from "@score-linter/score-model";

import { describeRule, type RuleGroup, ruleGroups, type RuleInfo } from "./catalog.js";
import { countBySeverity, presentIssues, type ReportedIssue } from "./report.js";
import { type Settings, type SettingsOps, settingsOps } from "./settings.js";

/** ホストだけが知っている警告（版の食い違い・読めなかった小節など）。 */
export interface HostDiagnostic {
  id: string;
  message: string;
  /** 小節の通し番号。楽譜全体なら 0。 */
  measure: number;
}

export interface LintRequest {
  diagnostics?: readonly HostDiagnostic[];
  /** ミリ秒を返す時計。渡したときだけ {@link LintOutcome.timings} が埋まる。 */
  now?: () => number;
}

export interface LintOutcome {
  /** ホストの警告も含めて、表示する順に並べたもの。 */
  issues: ReportedIssue[];
  counts: Record<Severity, number>;
  timings: RuleTiming[];
}

/**
 * ホストが lint に使う唯一の入口。ルールの一覧はここで一度だけ受け取る。
 * メソッドは this を使わないので、取り出して QML のバンドルからそのまま公開してよい。
 */
export interface LintApp extends SettingsOps {
  readonly rules: readonly Rule[];
  /** ルールの並びのまま。 */
  readonly ruleInfos: RuleInfo[];
  readonly catalog: RuleGroup[];
  lint(score: Score, settings: Settings, request?: LintRequest): LintOutcome;
}

function diagnosticIssue({ id, message, measure }: HostDiagnostic): Issue {
  return {
    ruleId: id,
    severity: "warning",
    category: "internal",
    message,
    at: { partId: null, staff: null, measure, tick: 0 },
    detail: null,
  };
}

export function createLintApp(rules: readonly Rule[]): LintApp {
  const linter = createLinter(rules);
  const ruleInfos = rules.map(describeRule);

  return {
    ...settingsOps(rules),
    rules,
    ruleInfos,
    catalog: ruleGroups(ruleInfos),
    lint(score, settings, request = {}) {
      const { now, diagnostics = [] } = request;
      // 時計は createLinter の引数でしか渡せず、呼ぶたびに渡される時計が違いうるので、その都度作る
      const result = (now ? createLinter(rules, { now }) : linter).lint(score, settings);
      // 同じ位置・同じ重さならホストの警告が先。安定ソートなので、渡す順がそのまま残る
      const issues = presentIssues(score, [...diagnostics.map(diagnosticIssue), ...result.issues]);
      return { issues, counts: countBySeverity(issues), timings: result.timings };
    },
  };
}
