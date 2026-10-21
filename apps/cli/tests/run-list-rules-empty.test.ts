import { describe, expect, it } from "vitest";

import { EXIT_OK, run } from "../src/run.ts";

describe("run --list-rules: ルールが 0 件のとき", () => {
  it("例外を投げず空の一覧を返す", () => {
    const out: string[] = [];
    const code = run(
      ["--list-rules"],
      {
        readFile: () => {
          throw new Error("unused");
        },
        stdout: (t) => out.push(t),
        stderr: () => {
          throw new Error("unexpected stderr");
        },
      },
      [],
    );
    expect(code).toBe(EXIT_OK);
    expect(out.join("\n")).toBe("");
  });
});
