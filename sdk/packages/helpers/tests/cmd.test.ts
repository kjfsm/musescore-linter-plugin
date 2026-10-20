import type { Score } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it, vi } from "vitest";
import { withCmd } from "../src/cmd.js";

function makeScore() {
  const startCmd = vi.fn();
  const endCmd = vi.fn();
  const score = { startCmd, endCmd } as unknown as Score;
  return { score, startCmd, endCmd };
}

describe("withCmd", () => {
  it("calls startCmd, runs fn, then endCmd(false) and returns the value", () => {
    const { score, startCmd, endCmd } = makeScore();
    const result = withCmd(score, "do thing", () => 42);
    expect(result).toBe(42);
    expect(startCmd).toHaveBeenCalledTimes(1);
    expect(startCmd).toHaveBeenCalledWith("do thing");
    expect(endCmd).toHaveBeenCalledTimes(1);
    expect(endCmd).toHaveBeenCalledWith(false);
    expect(startCmd.mock.invocationCallOrder[0]).toBeLessThan(
      endCmd.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("rolls back with endCmd(true) and rethrows on exceptions", () => {
    const { score, startCmd, endCmd } = makeScore();
    const boom = new Error("boom");
    expect(() =>
      withCmd(score, "fail", () => {
        throw boom;
      }),
    ).toThrowError(boom);
    expect(startCmd).toHaveBeenCalledTimes(1);
    expect(endCmd).toHaveBeenCalledTimes(1);
    expect(endCmd).toHaveBeenCalledWith(true);
  });
});
