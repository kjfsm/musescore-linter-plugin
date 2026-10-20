import type { EngravingItem, Measure, Score, Segment } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it, vi } from "vitest";
import { findTodos, run } from "./logic.js";

function annotation(text: string): EngravingItem {
  return { name: "StaffText", text } as unknown as EngravingItem;
}

function makeScore(annotationsByMeasure: EngravingItem[][]): Score {
  const measures: Measure[] = [];
  for (const list of annotationsByMeasure) {
    const seg = {
      annotations: list,
      nextInMeasure: null,
    } as unknown as Segment;
    measures.push({ firstSegment: seg, nextMeasure: null } as unknown as Measure);
  }
  for (let i = 0; i < measures.length - 1; i++) {
    (measures[i] as { nextMeasure: Measure | null }).nextMeasure = measures[i + 1] ?? null;
  }
  return {
    firstMeasure: measures[0] ?? null,
    showElementInScore: vi.fn(),
  } as unknown as Score;
}

describe("findTodos", () => {
  it("returns annotations whose text matches TODO or FIXME", () => {
    const a = annotation("TODO: revoice");
    const b = annotation("regular note");
    const c = annotation("Fixme: rhythm");
    const score = makeScore([[a, b], [c]]);
    const hits = findTodos(score);
    expect(hits).toEqual([
      { element: a, text: "TODO: revoice" },
      { element: c, text: "Fixme: rhythm" },
    ]);
  });
});

describe("run", () => {
  it("jumps to the first hit and logs the matches", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const a = annotation("TODO: tempo");
    const score = makeScore([[a]]);
    run(score);
    expect(log).toHaveBeenCalledWith("found 1 TODO/FIXME annotation(s):");
    expect(log).toHaveBeenCalledWith("  - TODO: tempo");
    expect(score.showElementInScore).toHaveBeenCalledWith(a, 0);
    log.mockRestore();
  });

  it("reports when no annotations match", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const score = makeScore([[annotation("hello")]]);
    run(score);
    expect(log).toHaveBeenCalledWith("no TODO/FIXME annotations found");
    expect(score.showElementInScore).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
