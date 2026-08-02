import type { Checker } from "@musescore-linter/core";
import { getCheckerList } from "@musescore-linter/core";

import { allRuleIds } from "./lint";

const STORAGE_KEY = "musescore-linter:rule-overrides";

/** 設定パネルの表示順。ここに無いカテゴリは後ろに回す。 */
const CATEGORY_ORDER = ["articulation", "dynamics", "tempo", "notation"];

const CATEGORY_LABEL: Record<string, string> = {
  articulation: "奏法・アーティキュレーション",
  dynamics: "強弱",
  tempo: "テンポ",
  notation: "記譜",
};

export interface RuleGroup {
  category: string;
  label: string;
  checkers: Checker[];
}

export function ruleGroups(): RuleGroup[] {
  allRuleIds(); // checker の登録を保証する
  const byCategory = new Map<string, Checker[]>();
  for (const checker of getCheckerList()) {
    const bucket = byCategory.get(checker.category);
    if (bucket) bucket.push(checker);
    else byCategory.set(checker.category, [checker]);
  }
  const rank = (category: string): number => {
    const i = CATEGORY_ORDER.indexOf(category);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...byCategory.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([category, checkers]) => ({
      category,
      label: CATEGORY_LABEL[category] ?? category,
      checkers,
    }));
}

/**
 * checker が有効かどうか。core の linter と同じ判定にそろえる
 * （`enabledRules[id]` が未定義なら `checker.defaultEnabled` にフォールバック）。
 */
export function isEnabled(checker: Checker, enabledRules: Record<string, boolean>): boolean {
  const explicit = enabledRules[checker.id];
  return explicit === undefined ? checker.defaultEnabled !== false : explicit;
}

/**
 * localStorage には「既定から変えたぶん」だけを入れる。
 * こうしておくと checker が増減しても、触っていないルールは常に既定に従う。
 */
export function saveEnabledRules(storage: Storage, rules: Record<string, boolean>): void {
  const defaults = new Map(getCheckerList().map((c) => [c.id, c.defaultEnabled !== false]));
  const overrides: Record<string, boolean> = {};
  for (const [id, enabled] of Object.entries(rules)) {
    const byDefault = defaults.get(id);
    // 未知の id と、既定と同じ値は保存しない
    if (byDefault !== undefined && byDefault !== enabled) overrides[id] = enabled;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function loadEnabledRules(storage: Storage): Record<string, boolean> {
  const known = new Set(allRuleIds());
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 壊れた値は捨てて既定に戻す（ここは UI の永続化境界なので握ってよい）
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const rules: Record<string, boolean> = {};
  for (const [id, enabled] of Object.entries(parsed as Record<string, unknown>)) {
    // 削除・改名された checker の id が残っていても無視する
    if (typeof enabled === "boolean" && known.has(id)) rules[id] = enabled;
  }
  return rules;
}
