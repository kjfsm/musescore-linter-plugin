import type { Chord } from "@score-linter/musescore-api-types";
import { describe, expect, it } from "vitest";

import { getArticulationNames } from "../src/articulation.ts";

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
