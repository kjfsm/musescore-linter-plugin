import type { Checker, CheckerOptionValue, Severity } from "@musescore-linter/core";
import { getCheckerList, isCheckerEnabled, resolveCheckerOptions } from "@musescore-linter/core";

import { allRuleIds } from "./lint";

/** checker が有効かどうか。判定は core に一本化してある。 */
export const isEnabled = isCheckerEnabled;

const STORAGE_KEY = "musescore-linter:rule-overrides";
// checker 個別の設定は ON/OFF とは別のキーに置く。同じ袋に混ぜると、真偽値として
// 読み書きしている既存の経路が配列値を壊してしまう。
const OPTIONS_STORAGE_KEY = "musescore-linter:rule-options";

/** ruleId → { key: 値 }。「既定から変えたぶん」だけを持つ。 */
export type RuleOptions = Record<string, Record<string, CheckerOptionValue>>;

/** 設定パネルの表示順。ここに無いカテゴリは後ろに回す。 */
const CATEGORY_ORDER = ["articulation", "dynamics", "tempo", "slur-tie", "notation"];

const CATEGORY_LABEL: Record<string, string> = {
  articulation: "奏法・アーティキュレーション",
  dynamics: "強弱",
  tempo: "テンポ",
  "slur-tie": "スラー・タイ",
  notation: "記譜",
};

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

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
      // severity 順（error→warning→info）に並べる。同 severity 内は registerAll() の登録順のまま
      // （安定ソート）にしておくと、関連しあうペアが隣り合った現状の並びが崩れない。
      checkers: [...checkers].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
    }));
}

/**
 * localStorage には「既定から変えたぶん」だけを入れる。
 * こうしておくと checker が増減しても、触っていないルールは常に既定に従う。
 */
export function saveEnabledRules(storage: Storage, rules: Record<string, boolean>): void {
  // getCheckerList() は登録前だと空。登録を保証しないと defaults が空 Map になり、
  // すべての override が「未知の checker」として捨てられ、保存済みの設定を {} で
  // 上書きしてしまう（diffFromDefaults の allRuleIds() 呼び出しと同じ理由）。
  allRuleIds();
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

const sameValue = (a: CheckerOptionValue, b: CheckerOptionValue): boolean =>
  // resolveCheckerOptions が multiselect を choices 順に正規化するので、
  // 配列でも JSON 文字列の一致で比べられる
  Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b) : a === b;

/**
 * checker 個別の設定を「既定と違うキーだけ」に絞る。保存にも読み込み後の正規化にも使う。
 * 未知の checker / key / 不正な値は `resolveCheckerOptions` の側で落ちる。
 */
function diffFromDefaults(values: unknown): RuleOptions {
  if (typeof values !== "object" || values === null || Array.isArray(values)) return {};
  // getCheckerList() は登録前だと空。登録を保証しないと「未知の checker」として
  // 保存済みの設定を丸ごと落とし、その値で localStorage を上書きしてしまう。
  allRuleIds();
  const byId = new Map(getCheckerList().map((c) => [c.id, c]));
  const out: RuleOptions = {};

  for (const [id, raw] of Object.entries(values as Record<string, unknown>)) {
    const checker = byId.get(id);
    if (!checker?.options) continue;
    const resolved = resolveCheckerOptions(checker.options, raw);
    const defaults = resolveCheckerOptions(checker.options, undefined);
    const changed: Record<string, CheckerOptionValue> = {};
    for (const [key, value] of Object.entries(resolved)) {
      if (!sameValue(value, defaults[key])) changed[key] = value;
    }
    if (Object.keys(changed).length > 0) out[id] = changed;
  }
  return out;
}

export function saveRuleOptions(storage: Storage, values: RuleOptions): void {
  storage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(diffFromDefaults(values)));
}

export function loadRuleOptions(storage: Storage): RuleOptions {
  const raw = storage.getItem(OPTIONS_STORAGE_KEY);
  if (raw === null) return {};
  try {
    return diffFromDefaults(JSON.parse(raw));
  } catch {
    // 壊れた値は捨てて既定に戻す（UI の永続化境界なので握ってよい）
    return {};
  }
}

/** 設定パネルに出す表示用の値。既定値で埋めたうえで保存済みの差分を反映する。 */
export function effectiveOptions(
  checker: Checker,
  values: RuleOptions,
): Record<string, CheckerOptionValue> {
  return resolveCheckerOptions(checker.options, values[checker.id]);
}
