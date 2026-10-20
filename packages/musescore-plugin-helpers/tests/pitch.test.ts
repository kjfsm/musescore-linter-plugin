import type { Chord } from "@score-linter/musescore-api-types";
import { describe, expect, it } from "vitest";

import { getNotePitches } from "../src/pitch.js";

const chordWith = (pitches: Array<number | undefined>): Chord =>
  ({ notes: pitches.map((pitch) => ({ pitch })) }) as unknown as Chord;

describe("getNotePitches", () => {
  it("returns MIDI pitches of all notes in storage order", () => {
    expect(getNotePitches(chordWith([60, 64, 67]))).toEqual([60, 64, 67]);
  });

  it("skips notes without a numeric pitch", () => {
    expect(getNotePitches(chordWith([60, undefined, 67]))).toEqual([60, 67]);
  });

  it("returns an empty array when notes is missing", () => {
    expect(getNotePitches({} as unknown as Chord)).toEqual([]);
  });
});
