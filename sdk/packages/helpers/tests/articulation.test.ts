import type { Chord } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { getArticulationNames } from "../src/articulation.js";

const chordWith = (names: string[]) =>
  ({
    articulations: names.map((name) => ({ subtypeName: () => name })),
  }) as unknown as Chord;

describe("getArticulationNames", () => {
  it("returns the subtype names of the chord's articulations", () => {
    expect(getArticulationNames(chordWith(["Staccato", "Accent"]))).toEqual(["Staccato", "Accent"]);
  });

  it("drops empty names", () => {
    expect(getArticulationNames(chordWith(["Staccato", ""]))).toEqual(["Staccato"]);
  });

  it("returns [] for a chord with no articulations", () => {
    expect(getArticulationNames({ articulations: [] } as unknown as Chord)).toEqual([]);
  });
});
