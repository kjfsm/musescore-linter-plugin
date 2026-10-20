import { describe, expect, it } from "vitest";

import { parseOptionText, resolveOptions } from "../src/options.js";
import type { OptionSpecs } from "../src/types.js";

const SPECS = {
  scope: {
    label: "範囲",
    type: "select",
    choices: [
      { value: "all", label: "全部" },
      { value: "group", label: "グループ" },
    ],
    default: "all",
  },
  symbols: {
    label: "記号",
    type: "multiselect",
    choices: [
      { value: "bracket", label: "角括弧" },
      { value: "square", label: "括弧" },
      { value: "brace", label: "大括弧" },
    ],
    default: ["bracket", "square"],
  },
  strict: { label: "厳格", type: "boolean", default: false },
} as const satisfies OptionSpecs;

describe("resolveOptions", () => {
  it("宣言が無ければ空オブジェクト", () => {
    expect(resolveOptions({}, { a: 1 })).toEqual({});
  });

  it("未指定なら既定値で埋める", () => {
    expect(resolveOptions(SPECS, undefined)).toEqual({
      scope: "all",
      symbols: ["bracket", "square"],
      strict: false,
    });
  });

  it("既定の配列は複製され、呼び出し側が書き換えても宣言が汚れない", () => {
    const a = resolveOptions(SPECS, undefined);
    a.symbols.push("brace");
    expect(resolveOptions(SPECS, undefined).symbols).toEqual(["bracket", "square"]);
  });

  it("オブジェクトでない生値は既定のまま扱う", () => {
    for (const raw of [null, 42, "x", ["a"]]) {
      expect(resolveOptions(SPECS, raw).scope).toBe("all");
    }
  });

  it("有効な値で上書きする", () => {
    expect(resolveOptions(SPECS, { scope: "group", strict: true })).toMatchObject({
      scope: "group",
      strict: true,
    });
  });

  it("未知キーは黙って捨てる", () => {
    expect(resolveOptions(SPECS, { scope: "group", nope: 1 })).not.toHaveProperty("nope");
  });

  it("型不一致はそのキーだけ既定へ落とし、他のキーは活かす", () => {
    const out = resolveOptions(SPECS, { scope: 123, strict: true });
    expect(out.scope).toBe("all");
    expect(out.strict).toBe(true);
  });

  it("choices に無い select 値は既定へ落とす", () => {
    expect(resolveOptions(SPECS, { scope: "nonsense" }).scope).toBe("all");
  });

  it("multiselect は不正要素を除去し、choices 順に正規化して重複を除く", () => {
    expect(
      resolveOptions(SPECS, { symbols: ["brace", "nope", "bracket", "brace", 7] }).symbols,
    ).toEqual(["bracket", "brace"]);
  });

  it("multiselect の空配列は有効な指定として通す", () => {
    expect(resolveOptions(SPECS, { symbols: [] }).symbols).toEqual([]);
  });

  it("multiselect に配列以外を渡したら既定へ落とす", () => {
    expect(resolveOptions(SPECS, { symbols: "bracket" }).symbols).toEqual(["bracket", "square"]);
  });
});

describe("parseOptionText", () => {
  it("select は choices のみ受理する", () => {
    expect(parseOptionText("scope", SPECS.scope, "group")).toEqual({ ok: true, value: "group" });
    const bad = parseOptionText("scope", SPECS.scope, "nope");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("all / group");
  });

  it("multiselect はカンマ区切りを choices 順に正規化する", () => {
    expect(parseOptionText("symbols", SPECS.symbols, "square,bracket")).toEqual({
      ok: true,
      value: ["bracket", "square"],
    });
  });

  it("multiselect の空文字列は空配列", () => {
    expect(parseOptionText("symbols", SPECS.symbols, "")).toEqual({ ok: true, value: [] });
  });

  it("multiselect に未知の値が 1 つでもあればエラー", () => {
    const bad = parseOptionText("symbols", SPECS.symbols, "bracket,nope");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("nope");
  });

  it("boolean は true/false 表記を受理し、それ以外はエラー", () => {
    expect(parseOptionText("strict", SPECS.strict, "yes")).toEqual({ ok: true, value: true });
    expect(parseOptionText("strict", SPECS.strict, "0")).toEqual({ ok: true, value: false });
    expect(parseOptionText("strict", SPECS.strict, "maybe").ok).toBe(false);
  });
});
