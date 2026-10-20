import {
  createSnapshotWriter,
  parseSettings,
  serializeSettings,
  type Settings,
  withRuleEnabled,
  withRuleOption,
} from "@score-linter/lint-app";
import type { OptionValue } from "@score-linter/linter";

import {
  formatForCopy,
  lintCurrentScore,
  ruleCatalog,
  rules,
  selectionFor,
  settingsView,
} from "./lint.js";
import { isNewerVersion } from "./version.js";

function loadSettings(enabledJson: string, optionsJson: string): Settings {
  return parseSettings(rules, enabledJson, optionsJson);
}

function setRuleEnabled(settings: Settings, ruleId: string, enabled: boolean): Settings {
  return withRuleEnabled(rules, settings, ruleId, enabled);
}

function setRuleOption(
  settings: Settings,
  ruleId: string,
  key: string,
  value: OptionValue,
): Settings {
  return withRuleOption(rules, settings, ruleId, key, value);
}

export {
  createSnapshotWriter,
  formatForCopy,
  isNewerVersion,
  lintCurrentScore,
  loadSettings,
  ruleCatalog,
  selectionFor,
  serializeSettings,
  setRuleEnabled,
  setRuleOption,
  settingsView,
};
