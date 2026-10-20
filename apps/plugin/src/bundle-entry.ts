import { createSnapshotWriter } from "@score-linter/lint-app";

import { app, formatForCopy, lintCurrentScore, selectionFor } from "./lint.js";
import { isNewerVersion } from "./version.js";

const loadSettings = app.parseSettings;
const serializeSettings = app.serializeSettings;
const setRuleEnabled = app.withRuleEnabled;
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
  setRuleEnabled,
  setRuleOption,
  settingsView,
};
