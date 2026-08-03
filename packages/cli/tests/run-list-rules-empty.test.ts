import { describe, expect, it, vi } from "vitest";

// registerAll() を no-op にモックし、reset() 後の checker registry を実際に
// 空のまま保つ。--list-rules は内部で毎回 registerCheckers()（reset + registerAll）
// を呼ぶので、registry を外から空にしても効かない。0 件の checker という状況を
// 本物の run() 経路で再現するにはこのモックが必要。
vi.mock("@musescore-linter/checkers", () => ({ registerAll: vi.fn() }));

const { EXIT_OK, run } = await import("../src/run.js");

describe("run --list-rules: checker が 0 件のとき", () => {
  it("例外を投げず空の一覧を返す（Math.max(..., 0) の防御）", () => {
    const out: string[] = [];
    const code = run(["--list-rules"], {
      readFile: () => {
        throw new Error("unused");
      },
      stdout: (t) => out.push(t),
      stderr: () => {
        throw new Error("unexpected stderr");
      },
    });
    expect(code).toBe(EXIT_OK);
    expect(out.join("\n")).toBe("");
  });
});
