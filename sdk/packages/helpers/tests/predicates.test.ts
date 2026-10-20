import type { ScoreElement } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { isChord, isNote, isRest } from "../src/predicates.js";

const fake = (name: string) => ({ name }) as unknown as ScoreElement;

describe("predicates", () => {
  it("isChord matches only elements named 'Chord'", () => {
    expect(isChord(fake("Chord"))).toBe(true);
    expect(isChord(fake("Note"))).toBe(false);
    expect(isChord(null)).toBe(false);
    expect(isChord(undefined)).toBe(false);
  });

  it("isNote matches only elements named 'Note'", () => {
    expect(isNote(fake("Note"))).toBe(true);
    expect(isNote(fake("Chord"))).toBe(false);
    expect(isNote(null)).toBe(false);
  });

  it("isRest matches only elements named 'Rest'", () => {
    expect(isRest(fake("Rest"))).toBe(true);
    expect(isRest(fake("Chord"))).toBe(false);
    expect(isRest(null)).toBe(false);
  });
});
