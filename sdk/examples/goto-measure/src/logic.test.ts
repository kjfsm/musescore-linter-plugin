import type { Measure, Score } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it, vi } from "vitest";
import { run } from "./logic.js";

function makeScore(measureCount: number) {
  const measures: Measure[] = [];
  for (let i = 0; i < measureCount; i++) {
    measures.push({ no: i, nextMeasure: null } as unknown as Measure);
  }
  for (let i = 0; i < measures.length - 1; i++) {
    (measures[i] as { nextMeasure: Measure | null }).nextMeasure = measures[i + 1] ?? null;
  }
  const showElementInScore = vi.fn();
  const score = {
    firstMeasure: measures[0] ?? null,
    showElementInScore,
  } as unknown as Score;
  return { score, showElementInScore };
}

describe("goto-measure run", () => {
  it("jumps to measure index 7 when present", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { score, showElementInScore } = makeScore(10);
    run(score);
    expect(showElementInScore).toHaveBeenCalledWith(expect.objectContaining({ no: 7 }), 0);
    expect(log).toHaveBeenCalledWith("jumped to measure index 7");
    log.mockRestore();
  });

  it("logs an error when the measure is missing", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { score, showElementInScore } = makeScore(3);
    run(score);
    expect(showElementInScore).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("score has no measure with index 7");
    log.mockRestore();
  });

  it("handles null score", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    run(null);
    expect(log).toHaveBeenCalledWith("no score is open");
    log.mockRestore();
  });
});
