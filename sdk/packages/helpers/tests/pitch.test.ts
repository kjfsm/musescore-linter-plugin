import type { Chord } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { getNotePitches, getNoteSpellings } from "../src/pitch.js";

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

describe("getNoteSpellings", () => {
  it("reads pitch / tpc / line and detects a shown accidental", () => {
    const chord = {
      notes: [
        { pitch: 66, tpc: 20, line: 5, accidental: { name: "Accidental" } },
        { pitch: 65, tpc: 13, line: 5, accidental: null },
      ],
    } as unknown as Chord;
    expect(getNoteSpellings(chord)).toEqual([
      { pitch: 66, tpc: 20, line: 5, accidentalShown: true },
      { pitch: 65, tpc: 13, line: 5, accidentalShown: false },
    ]);
  });

  it("falls back to pitch -1 when unavailable", () => {
    const chord = {
      notes: [{ tpc: 14, line: 0, accidental: null }],
    } as unknown as Chord;
    expect(getNoteSpellings(chord)).toEqual([
      { pitch: -1, tpc: 14, line: 0, accidentalShown: false },
    ]);
  });
});
