import { createSnapshotWriter } from "@score-linter/lint-app";

import { app, formatForCopy, lintCurrentScore, selectionFor } from "./lint.ts";
import { isNewerVersion } from "./version.ts";

const loadSettings = app.parseSettings;
const serializeSettings = app.serializeSettings;
const setPreset = app.withPreset;
const setRuleEnabled = app.withRuleEnabled;
const setGroupEnabled = app.withGroupEnabled;
const setRuleOption = app.withRuleOption;
const settingsView = app.settingsView;

function ruleCatalog() {
  return app.catalog;
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
  setGroupEnabled,
  setPreset,
  setRuleEnabled,
  setRuleOption,
  settingsView,
};
