import type { ScoreElement, Spanner } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { getSpannerRange, isSlur } from "../src/spanner.js";

const fake = (name: string) => ({ name }) as unknown as ScoreElement;

describe("isSlur", () => {
  it('matches "Slur"', () => expect(isSlur(fake("Slur"))).toBe(true));
  it("rejects other names", () => {
    expect(isSlur(fake("Hairpin"))).toBe(false);
    expect(isSlur(fake("SlurSegment"))).toBe(false);
  });
  it("rejects null/undefined", () => {
    expect(isSlur(null)).toBe(false);
    expect(isSlur(undefined)).toBe(false);
  });
});

describe("getSpannerRange", () => {
  it("computes startTick and endTick from spanner fractions", () => {
    const sp = {
      spannerTick: { ticks: 480 },
      spannerTicks: { ticks: 960 },
    } as unknown as Spanner;
    expect(getSpannerRange(sp)).toEqual({ startTick: 480, endTick: 1440 });
  });

  it("treats null fractions as 0", () => {
    const sp = {
      spannerTick: null,
      spannerTicks: null,
    } as unknown as Spanner;
    expect(getSpannerRange(sp)).toEqual({ startTick: 0, endTick: 0 });
  });
});
