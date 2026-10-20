import type { ScoreElement, Tie } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { getTiePitches, isTie } from "../src/tie.js";

const fake = (name: string) => ({ name }) as unknown as ScoreElement;

const tieWith = (startPitch?: number, endPitch?: number): Tie =>
  ({
    name: "Tie",
    startNote: startPitch === undefined ? null : { pitch: startPitch },
    endNote: endPitch === undefined ? null : { pitch: endPitch },
  }) as unknown as Tie;

describe("isTie", () => {
  it("matches only elements named 'Tie'", () => {
    expect(isTie(fake("Tie"))).toBe(true);
    expect(isTie(fake("Slur"))).toBe(false);
    expect(isTie(null)).toBe(false);
    expect(isTie(undefined)).toBe(false);
  });
});

describe("getTiePitches", () => {
  it("returns both endpoint pitches", () => {
    expect(getTiePitches(tieWith(60, 60))).toEqual({ startPitch: 60, endPitch: 60 });
    expect(getTiePitches(tieWith(60, 62))).toEqual({ startPitch: 60, endPitch: 62 });
  });

  it("returns null when an endpoint note is missing", () => {
    expect(getTiePitches(tieWith(60, undefined))).toBeNull();
    expect(getTiePitches(tieWith(undefined, 60))).toBeNull();
  });
});
