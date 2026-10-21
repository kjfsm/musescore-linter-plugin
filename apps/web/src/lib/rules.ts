import type { Settings } from "@score-linter/lint-app";

import { app } from "./lint";

// 旧版と同じ置き場所。ON/OFF とオプションを別のキーに置く形も旧版のまま。
const ENABLED_KEY = "musescore-linter:rule-overrides";
const OPTIONS_KEY = "musescore-linter:rule-options";
const PRESET_KEY = "musescore-linter:preset";

export function loadSettings(storage: Storage): Settings {
  return app.parseSettings(
    storage.getItem(ENABLED_KEY),
    storage.getItem(OPTIONS_KEY),
    storage.getItem(PRESET_KEY),
  );
}

export function saveSettings(storage: Storage, settings: Settings): void {
  const { enabled, options, preset } = app.serializeSettings(settings);
  storage.setItem(ENABLED_KEY, enabled);
  storage.setItem(OPTIONS_KEY, options);
  storage.setItem(PRESET_KEY, preset);
}
