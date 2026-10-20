import type { ScoreElement } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import type { Hairpin } from "../src/hairpin.js";
import { getHairpinRange, isHairpin } from "../src/hairpin.js";

const fake = (name: string) => ({ name }) as unknown as ScoreElement;

describe("isHairpin", () => {
  it('matches "Hairpin"', () => expect(isHairpin(fake("Hairpin"))).toBe(true));
  it("rejects other names", () => {
    expect(isHairpin(fake("Dynamic"))).toBe(false);
    expect(isHairpin(fake("HairpinSegment"))).toBe(false);
  });
  it("rejects null/undefined", () => {
    expect(isHairpin(null)).toBe(false);
    expect(isHairpin(undefined)).toBe(false);
  });
});

describe("getHairpinRange", () => {
  it("computes startTick and endTick from spanner fractions", () => {
    const hp = {
      name: "Hairpin",
      spannerTick: { ticks: 480 },
      spannerTicks: { ticks: 960 },
    } as unknown as Hairpin;
    expect(getHairpinRange(hp)).toEqual({ startTick: 480, endTick: 1440 });
  });

  it("treats null FractionWrapper as 0", () => {
    const hp = {
      name: "Hairpin",
      spannerTick: null,
      spannerTicks: null,
    } as unknown as Hairpin;
    expect(getHairpinRange(hp)).toEqual({ startTick: 0, endTick: 0 });
  });
});
