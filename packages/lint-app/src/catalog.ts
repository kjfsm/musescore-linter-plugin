import type { OptionSpec, Rule, Severity } from "@score-linter/linter";

export type OptionInfo = OptionSpec & { key: string };

/** 設定画面に渡すルールの情報。QML の Repeater に渡すので純データ。 */
export interface RuleInfo {
  id: string;
  name: string;
  description: string;
  category: string;
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

const CATEGORY_LABELS: Record<string, string> = {
  tempo: "テンポ",
  dynamics: "強弱",
  articulation: "奏法・アーティキュレーション",
  "slur-tie": "スラー・タイ",
  notation: "記譜",
};

const CATEGORY_ORDER = ["tempo", "dynamics", "articulation", "slur-tie", "notation"];

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export interface RuleGroup {
  category: string;
  label: string;
  rules: RuleInfo[];
}

/**
 * 設定画面に出すカテゴリごとのルール。カテゴリは決まった順に並べ、表に無いカテゴリも
 * 末尾に必ず含める — 固定の一覧で回すと、カテゴリを足したときにそのルールが画面から消える。
 * カテゴリの中は severity の重い順、同じ severity の中はルールの並び（関連するペアが隣り合う）。
 */
export function ruleGroups(rules: readonly Rule[]): RuleGroup[] {
  const rank = (id: string): number => {
    const i = CATEGORY_ORDER.indexOf(id);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  const categories = [...new Set(rules.map((r) => r.meta.category))].sort(
    (a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0),
  );
  return categories.map((category) => {
    const members = rules.map(describeRule).filter((r) => r.category === category);
    const ordered = members
      .map((r, i) => ({ r, i }))
      .sort((a, b) => SEVERITY_RANK[a.r.severity] - SEVERITY_RANK[b.r.severity] || a.i - b.i)
      .map(({ r }) => r);
    return { category, label: CATEGORY_LABELS[category] ?? category, rules: ordered };
  });
}
