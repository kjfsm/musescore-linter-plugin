import type { OptionSpec, Rule, RuleCategory, RuleTier, Severity } from "@score-linter/linter";
import { compareSeverity } from "@score-linter/linter";

export type OptionInfo = OptionSpec & { key: string };

/** 設定画面に渡すルールの情報。QML の Repeater に渡すので純データ。 */
export interface RuleInfo {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: Severity;
  tier: RuleTier;
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

/**
 * 話題の欄に並べ、グループの一括 ON/OFF の対象にするか。試験中のルールを外すのは、
 * 一括で ON にしたときに不安定なルールまで動き出さないようにするため。
 */
export const belongsToTopicGroup = (tier: RuleTier): boolean => tier !== "nursery";

export interface RuleGroup {
  category: RuleCategory;
  label: string;
  rules: RuleInfo[];
}

export interface RuleCatalog {
  /** 話題ごとの欄。`recommended` と `pedantic` のルールだけが入る。 */
  groups: RuleGroup[];
  /** 話題を問わず、`nursery` のルールをまとめた「試験中」の欄。 */
  nursery: RuleInfo[];
}

const byCategoryThenSeverity = (infos: readonly RuleInfo[]): RuleInfo[] =>
  infos
    .map((r, i) => ({ r, i }))
    .sort(
      (a, b) =>
        CATEGORIES[a.r.category].rank - CATEGORIES[b.r.category].rank ||
        compareSeverity(a.r.severity, b.r.severity) ||
        a.i - b.i,
    )
    .map(({ r }) => r);

/**
 * 設定画面に出すルールの並び。
 * 欄の中は severity の重い順、同じ severity の中はルールの並び（関連するペアが隣り合う）。
 * 推奨と細かい指摘で欄を分けないのは、同じ話題のルールを 1 か所にまとめておくため。
 */
export function ruleCatalog(infos: readonly RuleInfo[]): RuleCatalog {
  const regular = byCategoryThenSeverity(infos.filter((r) => belongsToTopicGroup(r.tier)));
  const categories = [...new Set(regular.map((r) => r.category))];
  return {
    groups: categories.map((category) => ({
      category,
      label: CATEGORIES[category].label,
      rules: regular.filter((r) => r.category === category),
    })),
    nursery: byCategoryThenSeverity(infos.filter((r) => !belongsToTopicGroup(r.tier))),
  };
}
