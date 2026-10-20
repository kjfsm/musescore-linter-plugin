import type { Linter } from "@score-linter/linter";
import type { Score } from "@score-linter/score-model";

import { presentIssues, type ReportedIssue } from "./report.js";
import { type Settings, toLinterConfig } from "./settings.js";

export type { OptionInfo, RuleGroup, RuleInfo } from "./catalog.js";
export { describeRule, ruleGroups } from "./catalog.js";
export type { FileResult, OutputFormat } from "./format.js";
export {
  formatCsv,
  formatGithub,
  formatJson,
  formatMarkdown,
  formatResults,
  formatText,
  locationText,
} from "./format.js";
export type { ReportedIssue } from "./report.js";
export { compareIssues, countBySeverity, measureText, presentIssues } from "./report.js";
export type { SnapshotWriter } from "./snapshot.js";
export { createSnapshotWriter } from "./snapshot.js";
export type { Settings } from "./settings.js";
export {
  isRuleEnabled,
  normalizeSettings,
  parseSettings,
  ruleOptionValues,
  serializeSettings,
  toLinterConfig,
  withRuleEnabled,
  withRuleOption,
} from "./settings.js";

export function lintScore(linter: Linter, score: Score, settings: Settings): ReportedIssue[] {
  return presentIssues(score, linter.lint(score, toLinterConfig(settings)).issues);
}
