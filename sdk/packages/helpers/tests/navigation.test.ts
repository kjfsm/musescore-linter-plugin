import type {
  Cursor,
  EngravingItem,
  Measure,
  Score,
  Segment,
} from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it, vi } from "vitest";
import {
  findMeasureByIndex,
  findSegmentByTick,
  jumpToElement,
  jumpToMeasure,
} from "../src/navigation.js";

function makeMeasures(numbers: number[]): Measure {
  // Build a linked list where each measure has the given `no`, in order.
  const nodes = numbers.map((no) => ({ no, nextMeasure: null }) as unknown as Measure);
  for (let i = 0; i < nodes.length - 1; i++) {
    (nodes[i] as { nextMeasure: Measure | null }).nextMeasure = nodes[i + 1] ?? null;
  }
  return nodes[0] as Measure;
}

describe("findMeasureByIndex", () => {
  it("returns the measure whose `no` equals the index", () => {
    const first = makeMeasures([0, 1, 2, 3]);
    const score = { firstMeasure: first } as unknown as Score;
    expect(findMeasureByIndex(score, 2)?.no).toBe(2);
  });

  it("returns null when no measure matches", () => {
    const first = makeMeasures([0, 1]);
    const score = { firstMeasure: first } as unknown as Score;
    expect(findMeasureByIndex(score, 5)).toBeNull();
  });

  it("returns null for an empty score", () => {
    const score = { firstMeasure: null } as unknown as Score;
    expect(findMeasureByIndex(score, 0)).toBeNull();
  });
});

describe("findSegmentByTick", () => {
  it("rewinds a fresh cursor to the requested tick and returns its segment", () => {
    const segment = { tick: 1920 } as unknown as Segment;
    const rewindToTick = vi.fn();
    const cursor = {
      rewindToTick,
      get segment() {
        return segment;
      },
    } as unknown as Cursor;
    const score = { newCursor: () => cursor } as unknown as Score;
    expect(findSegmentByTick(score, 1920)).toBe(segment);
    expect(rewindToTick).toHaveBeenCalledWith(1920);
  });

  it("returns null when newCursor returns null", () => {
    const score = { newCursor: () => null } as unknown as Score;
    expect(findSegmentByTick(score, 0)).toBeNull();
  });
});

describe("jumpToElement", () => {
  it("calls showElementInScore with staffIdx 0 by default", () => {
    const showElementInScore = vi.fn();
    const score = { showElementInScore } as unknown as Score;
    const el = { name: "Measure" } as unknown as EngravingItem;
    jumpToElement(score, el);
    expect(showElementInScore).toHaveBeenCalledWith(el, 0);
  });

  it("uses the given staffIdx", () => {
    const showElementInScore = vi.fn();
    const score = { showElementInScore } as unknown as Score;
    const el = { name: "Measure" } as unknown as EngravingItem;
    jumpToElement(score, el, 3);
    expect(showElementInScore).toHaveBeenCalledWith(el, 3);
  });

  it("is a no-op when element is null", () => {
    const showElementInScore = vi.fn();
    const score = { showElementInScore } as unknown as Score;
    jumpToElement(score, null);
    expect(showElementInScore).not.toHaveBeenCalled();
  });
});

describe("jumpToMeasure", () => {
  it("returns true and jumps when the measure is found", () => {
    const showElementInScore = vi.fn();
    const first = makeMeasures([0, 1, 2]);
    const score = {
      firstMeasure: first,
      showElementInScore,
    } as unknown as Score;
    expect(jumpToMeasure(score, 1, 2)).toBe(true);
    expect(showElementInScore).toHaveBeenCalledWith(expect.objectContaining({ no: 1 }), 2);
  });

  it("returns false when the measure is missing", () => {
    const showElementInScore = vi.fn();
    const first = makeMeasures([0, 1]);
    const score = {
      firstMeasure: first,
      showElementInScore,
    } as unknown as Score;
    expect(jumpToMeasure(score, 99)).toBe(false);
    expect(showElementInScore).not.toHaveBeenCalled();
  });
});
