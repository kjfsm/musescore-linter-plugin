import type { OptionSpec, Rule, RuleCategory, Severity } from "@score-linter/linter";
import { compareSeverity } from "@score-linter/linter";

export type OptionInfo = OptionSpec & { key: string };

/** 設定画面に渡すルールの情報。QML の Repeater に渡すので純データ。 */
export interface RuleInfo {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: Severity;
  defaultEnabled: boolean;
  options: OptionInfo[];
}

export function describeRule(rule: Rule): RuleInfo {
  return {
    id: rule.id,
    ...rule.meta,
    options: Object.keys(rule.options).map((key) => ({ key, ...rule.options[key]! })),
  };
}

const CATEGORIES: Record<RuleCategory, { label: string; rank: number }> = {
  tempo: { label: "テンポ", rank: 0 },
  dynamics: { label: "強弱", rank: 1 },
  articulation: { label: "奏法・アーティキュレーション", rank: 2 },
  "slur-tie": { label: "スラー・タイ", rank: 3 },
  notation: { label: "記譜", rank: 4 },
};

export interface RuleGroup {
  category: RuleCategory;
  label: string;
  rules: RuleInfo[];
}

/**
 * 設定画面に出すカテゴリごとのルール。
 * カテゴリの中は severity の重い順、同じ severity の中はルールの並び（関連するペアが隣り合う）。
 */
export function ruleGroups(infos: readonly RuleInfo[]): RuleGroup[] {
  const categories = [...new Set(infos.map((r) => r.category))].sort(
    (a, b) => CATEGORIES[a].rank - CATEGORIES[b].rank,
  );
  return categories.map((category) => {
    const members = infos.filter((r) => r.category === category);
    const ordered = members
      .map((r, i) => ({ r, i }))
      .sort((a, b) => compareSeverity(a.r.severity, b.r.severity) || a.i - b.i)
      .map(({ r }) => r);
    return { category, label: CATEGORIES[category].label, rules: ordered };
  });
}
