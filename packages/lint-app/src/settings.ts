import type { OptionValue, Rule } from "@score-linter/linter";
import { resolveOptions } from "@score-linter/linter";

/**
 * 利用者が既定値から変えた分だけを持つ設定。保存するのもこの形で、読むときに今の既定値と
 * 合わせる。全値を保存すると、ルールの既定値を変えても、触っていない設定に新しい既定値が効かない。
 */
export interface Settings {
  enabled: Record<string, boolean>;
  options: Record<string, Record<string, OptionValue>>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// resolveOptions が multiselect を choices の順にそろえるので、配列も文字列にして比べられる
const sameValue = (a: OptionValue, b: OptionValue | undefined): boolean =>
  Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b) : a === b;

/**
 * 保存されていた値を、既定値との差分だけに絞る。投げない。未知のルール・キー、型の合わない値、
 * 既定値と同じ値は捨てる。ルールの追加や改名で古い値が残っているのは普通のこと。
 */
export function normalizeSettings(
  rules: readonly Rule[],
  raw: { enabled?: unknown; options?: unknown },
): Settings {
  const enabledIn = isRecord(raw.enabled) ? raw.enabled : {};
  const optionsIn = isRecord(raw.options) ? raw.options : {};
  const settings: Settings = { enabled: {}, options: {} };

  for (const rule of rules) {
    const enabled = enabledIn[rule.id];
    if (typeof enabled === "boolean" && enabled !== rule.meta.defaultEnabled) {
      settings.enabled[rule.id] = enabled;
    }

    const given = optionsIn[rule.id];
    if (!isRecord(given)) continue;
    const resolved = resolveOptions(rule.options, given);
    const defaults = resolveOptions(rule.options, undefined);
    const changed: Record<string, OptionValue> = {};
    for (const key of Object.keys(resolved)) {
      if (!sameValue(resolved[key]!, defaults[key])) changed[key] = resolved[key]!;
    }
    if (Object.keys(changed).length > 0) settings.options[rule.id] = changed;
  }
  return settings;
}

export function withRuleEnabled(
  rules: readonly Rule[],
  settings: Settings,
  ruleId: string,
  enabled: boolean,
): Settings {
  return normalizeSettings(rules, {
    enabled: { ...settings.enabled, [ruleId]: enabled },
    options: settings.options,
  });
}

export function withRuleOption(
  rules: readonly Rule[],
  settings: Settings,
  ruleId: string,
  key: string,
  value: OptionValue,
): Settings {
  return normalizeSettings(rules, {
    enabled: settings.enabled,
    options: { ...settings.options, [ruleId]: { ...settings.options[ruleId], [key]: value } },
  });
}

/** 設定画面に表示する値。Settings と同じ形だが、どのルールも既定値で埋まっている。 */
export interface SettingsView {
  enabled: Record<string, boolean>;
  options: Record<string, Record<string, OptionValue>>;
}

export function settingsView(rules: readonly Rule[], settings: Settings): SettingsView {
  const view: SettingsView = { enabled: {}, options: {} };
  for (const rule of rules) {
    view.enabled[rule.id] = settings.enabled[rule.id] ?? rule.meta.defaultEnabled;
    view.options[rule.id] = resolveOptions(rule.options, settings.options[rule.id]);
  }
  return view;
}

function parseJson(text: string | null | undefined): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // 壊れた保存値は既定に戻す。保存の境界なので握ってよい。
    return undefined;
  }
}

/**
 * ホストの保存先（QML の Settings・localStorage）に置いた 2 つの JSON 文字列から読む。
 * ON/OFF とオプションを別の場所に置くのは、旧版の保存値をそのまま読めるようにするため。
 */
export function parseSettings(
  rules: readonly Rule[],
  enabledJson: string | null | undefined,
  optionsJson: string | null | undefined,
): Settings {
  return normalizeSettings(rules, {
    enabled: parseJson(enabledJson),
    options: parseJson(optionsJson),
  });
}

export function serializeSettings(settings: Settings): { enabled: string; options: string } {
  return { enabled: JSON.stringify(settings.enabled), options: JSON.stringify(settings.options) };
}
