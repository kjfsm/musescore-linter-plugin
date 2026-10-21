import { app, formatForCopy, selectionFor } from "./lint.ts";
import { createSnapshotSession, readLatestRelease, releasesApiUrl, runLint } from "./session.ts";

export const loadSettings = app.parseSettings;
export const serializeSettings = app.serializeSettings;
export const setPreset = app.withPreset;
export const setRuleEnabled = app.withRuleEnabled;
export const setGroupEnabled = app.withGroupEnabled;
export const setRuleOption = app.withRuleOption;
export const settingsView = app.settingsView;

export function ruleCatalog() {
  return app.catalog;
}

export {
  createSnapshotSession,
  formatForCopy,
  readLatestRelease,
  releasesApiUrl,
  runLint,
  selectionFor,
};
