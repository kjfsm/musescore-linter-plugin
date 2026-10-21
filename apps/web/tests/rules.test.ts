import type { Settings } from "@score-linter/lint-app";
import { describe, expect, it } from "vitest";

import { loadSettings, saveSettings } from "../src/lib/rules";

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

describe("設定の保存", () => {
  const DEFAULTS: Settings = { preset: "recommended", enabled: {}, options: {} };

  it("保存していなければすべて既定", () => {
    expect(loadSettings(new MemoryStorage())).toEqual(DEFAULTS);
  });

  it("保存した設定を読み戻せる", () => {
    const storage = new MemoryStorage();
    const settings: Settings = {
      preset: "all",
      enabled: { "pizz-arco": false },
      options: { "slur-tie-articulation-consistency": { scope: "group" } },
    };
    saveSettings(storage, settings);
    expect(loadSettings(storage)).toEqual(settings);
  });

  // 旧版の利用者の保存値をそのまま読めるよう、置き場所を変えない
  it("旧版と同じキーに、ON/OFF とオプションを分けて置く", () => {
    const storage = new MemoryStorage();
    saveSettings(storage, {
      preset: "recommended",
      enabled: { "pizz-arco": false },
      options: { "slur-tie-articulation-consistency": { scope: "group" } },
    });
    expect(storage.getItem("musescore-linter:rule-overrides")).toBe('{"pizz-arco":false}');
    expect(storage.getItem("musescore-linter:rule-options")).toBe(
      '{"slur-tie-articulation-consistency":{"scope":"group"}}',
    );
  });

  it("壊れた値は捨てて既定に戻す", () => {
    const storage = new MemoryStorage();
    storage.setItem("musescore-linter:rule-overrides", "{");
    expect(loadSettings(storage)).toEqual(DEFAULTS);
  });

  it("プリセットは別のキーに置き、プリセットの無い旧版の保存値は推奨のみとして読む", () => {
    const storage = new MemoryStorage();
    storage.setItem("musescore-linter:rule-overrides", '{"pizz-arco":false}');
    expect(loadSettings(storage)).toEqual({ ...DEFAULTS, enabled: { "pizz-arco": false } });
    saveSettings(storage, { ...DEFAULTS, preset: "all" });
    expect(storage.getItem("musescore-linter:preset")).toBe("all");
  });
});
