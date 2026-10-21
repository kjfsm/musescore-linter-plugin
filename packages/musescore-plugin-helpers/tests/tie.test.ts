import type { ScoreElement } from "@score-linter/musescore-api-types";
import { describe, expect, it } from "vitest";

import { isTie } from "../src/tie.ts";

const fake = (name: string) => ({ name }) as unknown as ScoreElement;

describe("isTie", () => {
  it("matches only elements named 'Tie'", () => {
    expect(isTie(fake("Tie"))).toBe(true);
    expect(isTie(fake("Slur"))).toBe(false);
    expect(isTie(null)).toBe(false);
    expect(isTie(undefined)).toBe(false);
  });
});
