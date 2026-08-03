import { beforeEach, describe, expect, it } from "vitest";

import { getAll, getById, isCheckerEnabled, register, reset } from "../src/checkerRegistry.js";
import type { Checker } from "../src/types.js";

function mockChecker(id: string): Checker {
  return {
    id,
    name: id,
    description: "",
    category: "test",
    severity: "warning",
    defaultEnabled: true,
    run: () => [],
  };
}

describe("checkerRegistry", () => {
  beforeEach(() => reset());

  it("登録順に取り出せる", () => {
    register(mockChecker("a"));
    register(mockChecker("b"));
    expect(getAll().map((c) => c.id)).toEqual(["a", "b"]);
    expect(getById("b")?.id).toBe("b");
    expect(getById("missing")).toBeNull();
  });

  it("getAll はコピーを返すので、書き換えても registry は壊れない", () => {
    register(mockChecker("a"));
    getAll().push(mockChecker("b"));
    expect(getAll().map((c) => c.id)).toEqual(["a"]);
  });

  // 黙って捨てていると、id を打ち間違えた checker が「登録したのに動かない」
  // 状態になり、気づく手段が無い。
  it("id が重複したら throw する", () => {
    register(mockChecker("dup"));
    expect(() => register(mockChecker("dup"))).toThrow(/dup/);
    expect(getAll()).toHaveLength(1);
  });

  it("id を持たないものは無視する", () => {
    register(undefined as unknown as Checker);
    register({ ...mockChecker("x"), id: "" });
    expect(getAll()).toHaveLength(0);
  });

  it("reset で空になる", () => {
    register(mockChecker("a"));
    reset();
    expect(getAll()).toHaveLength(0);
    expect(getById("a")).toBeNull();
  });
});

describe("isCheckerEnabled", () => {
  const on = mockChecker("on");
  const off = { ...mockChecker("off"), defaultEnabled: false };

  it("未指定なら defaultEnabled に従う", () => {
    expect(isCheckerEnabled(on)).toBe(true);
    expect(isCheckerEnabled(off)).toBe(false);
    expect(isCheckerEnabled(on, {})).toBe(true);
  });

  it("明示指定は defaultEnabled より優先される", () => {
    expect(isCheckerEnabled(on, { on: false })).toBe(false);
    expect(isCheckerEnabled(off, { off: true })).toBe(true);
  });

  it("他の checker の指定には影響されない", () => {
    expect(isCheckerEnabled(on, { other: false })).toBe(true);
  });
});
