import type { EngravingItem, Score, Selection } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { getSelectedElements, getSelectionRange, hasRangeSelection } from "../src/selection.js";

function scoreWith(selection: Selection | null): Score {
  return { selection } as unknown as Score;
}

const el = (name: string) => ({ name }) as unknown as EngravingItem;

describe("hasRangeSelection", () => {
  it("returns false when selection is null", () => {
    expect(hasRangeSelection(scoreWith(null))).toBe(false);
  });

  it("returns false for non-range selections", () => {
    const sel = { isRange: false, elements: [] } as unknown as Selection;
    expect(hasRangeSelection(scoreWith(sel))).toBe(false);
  });

  it("returns true for range selections", () => {
    const sel = { isRange: true, elements: [] } as unknown as Selection;
    expect(hasRangeSelection(scoreWith(sel))).toBe(true);
  });
});

describe("getSelectedElements", () => {
  it("returns an empty array when selection is null", () => {
    expect(getSelectedElements(scoreWith(null))).toEqual([]);
  });

  it("returns the selection's elements", () => {
    const elements = [el("Note"), el("Chord")];
    const sel = { isRange: false, elements } as unknown as Selection;
    expect(getSelectedElements(scoreWith(sel))).toBe(elements);
  });
});

describe("getSelectionRange", () => {
  it("returns null without a range selection", () => {
    expect(getSelectionRange(scoreWith(null))).toBeNull();
    const elementSel = { isRange: false, elements: [] } as unknown as Selection;
    expect(getSelectionRange(scoreWith(elementSel))).toBeNull();
  });

  it("derives ticks and tracks from a range selection", () => {
    const sel = {
      isRange: true,
      elements: [],
      startSegment: { tick: 480 },
      endSegment: { tick: 1920 },
      startStaff: 1,
      endStaff: 3,
    } as unknown as Selection;
    expect(getSelectionRange(scoreWith(sel))).toEqual({
      startTick: 480,
      endTick: 1920,
      startTrack: 4,
      endTrack: 12,
    });
  });

  it("uses MAX_SAFE_INTEGER when endSegment is null", () => {
    const sel = {
      isRange: true,
      elements: [],
      startSegment: { tick: 0 },
      endSegment: null,
      startStaff: 0,
      endStaff: 1,
    } as unknown as Selection;
    expect(getSelectionRange(scoreWith(sel))?.endTick).toBe(Number.MAX_SAFE_INTEGER);
  });
});
