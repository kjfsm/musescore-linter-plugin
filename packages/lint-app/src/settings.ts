import type { OptionValue, Preset, Rule, RuleCategory } from "@score-linter/linter";
import { isEnabledByDefault, isRuleEnabled, resolveOptions } from "@score-linter/linter";

import { belongsToTopicGroup } from "./catalog.js";

/**
 * 利用者が既定値から変えた分だけを持つ設定。保存するのもこの形で、読むときに今の既定値と
 * 合わせる。全値を保存すると、ルールの既定値を変えても、触っていない設定に新しい既定値が効かない。
 * ON/OFF の既定値は {@link Settings.preset} とルールの段階から決まる。
 */
export interface Settings {
  preset: Preset;
  enabled: Record<string, boolean>;
  options: Record<string, Record<string, OptionValue>>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// resolveOptions が multiselect を choices の順にそろえるので、配列も文字列にして比べられる
const sameValue = (a: OptionValue, b: OptionValue | undefined): boolean =>
  Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b) : a === b;

/** 設定画面に表示する値。どのルールも既定値で埋まっている。 */
export type SettingsView = Settings;

const parsePreset = (v: unknown): Preset => (v === "all" ? "all" : "recommended");

function parseJson(text: string | null | undefined): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // 壊れた保存値は既定に戻す。保存の境界なので握ってよい。
    return undefined;
  }
}

/** メソッドは this を使わない。LintApp から取り出して QML のバンドルで公開される。 */
export interface SettingsOps {
  /**
   * ホストの保存先（QML の Settings・localStorage）に置いた 3 つの文字列から読む。
   * ON/OFF・オプション・プリセットを別の場所に置くのは、旧版の保存値をそのまま読めるようにするため。
   * プリセットが無い・不正なら `recommended`。
   */
  parseSettings(
    enabledJson: string | null | undefined,
    optionsJson: string | null | undefined,
    preset?: string | null,
  ): Settings;
  serializeSettings(settings: Settings): { enabled: string; options: string; preset: Preset };
  /**
   * 生の値を、既定値との差分だけに絞る。投げない。未知のルール・キー、型の合わない値、
   * 既定値と同じ値は捨てる。ルールの追加や改名で古い値が残っているのは普通のこと。
   */
  normalizeSettings(raw: { preset?: unknown; enabled?: unknown; options?: unknown }): Settings;
  /** 切り替え後のプリセットの既定値と同じになった個別の ON/OFF は捨てる。 */
  withPreset(settings: Settings, preset: Preset): Settings;
  withRuleEnabled(settings: Settings, ruleId: string, enabled: boolean): Settings;
  /** そのカテゴリの `nursery` 以外のルールの個別の ON/OFF を書き換える。グループ単位では保存しない。 */
  withGroupEnabled(settings: Settings, category: RuleCategory, enabled: boolean): Settings;
  withRuleOption(settings: Settings, ruleId: string, key: string, value: OptionValue): Settings;
  settingsView(settings: Settings): SettingsView;
}

export function settingsOps(rules: readonly Rule[]): SettingsOps {
  const normalizeSettings: SettingsOps["normalizeSettings"] = (raw) => {
    const enabledIn = isRecord(raw.enabled) ? raw.enabled : {};
    const optionsIn = isRecord(raw.options) ? raw.options : {};
    const preset = parsePreset(raw.preset);
    const settings: Settings = { preset, enabled: {}, options: {} };

    for (const rule of rules) {
      const enabled = enabledIn[rule.id];
      if (typeof enabled === "boolean" && enabled !== isEnabledByDefault(rule.meta.tier, preset)) {
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
  };

  return {
    parseSettings: (enabledJson, optionsJson, preset) =>
      normalizeSettings({
        preset,
        enabled: parseJson(enabledJson),
        options: parseJson(optionsJson),
      }),
    serializeSettings: (settings) => ({
      enabled: JSON.stringify(settings.enabled),
      options: JSON.stringify(settings.options),
      preset: settings.preset,
    }),
    normalizeSettings,
    withPreset: (settings, preset) => normalizeSettings({ ...settings, preset }),
    withRuleEnabled: (settings, ruleId, enabled) =>
      normalizeSettings({ ...settings, enabled: { ...settings.enabled, [ruleId]: enabled } }),
    withGroupEnabled(settings, category, enabled) {
      const next = { ...settings.enabled };
      for (const rule of rules) {
        if (rule.meta.category === category && belongsToTopicGroup(rule.meta.tier)) {
          next[rule.id] = enabled;
        }
      }
      return normalizeSettings({ ...settings, enabled: next });
    },
    withRuleOption: (settings, ruleId, key, value) =>
      normalizeSettings({
        ...settings,
        options: { ...settings.options, [ruleId]: { ...settings.options[ruleId], [key]: value } },
      }),
    settingsView(settings) {
      const view: SettingsView = { preset: settings.preset, enabled: {}, options: {} };
      for (const rule of rules) {
        view.enabled[rule.id] = isRuleEnabled(rule, settings);
        view.options[rule.id] = resolveOptions(rule.options, settings.options[rule.id]);
      }
      return view;
    },
  };
}
