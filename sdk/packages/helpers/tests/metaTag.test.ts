import type { Score } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { getMetaTag } from "../src/metaTag.js";

function scoreWith(tags: Record<string, string>): Score {
  return { metaTag: (tag: string) => tags[tag] ?? "" } as unknown as Score;
}

describe("getMetaTag", () => {
  it("returns the value for non-empty tags", () => {
    const score = scoreWith({ workTitle: "Sonata" });
    expect(getMetaTag(score, "workTitle")).toBe("Sonata");
  });

  it("returns undefined for empty strings", () => {
    const score = scoreWith({ workTitle: "" });
    expect(getMetaTag(score, "workTitle")).toBeUndefined();
  });

  it("returns undefined for missing tags", () => {
    const score = scoreWith({});
    expect(getMetaTag(score, "composer")).toBeUndefined();
  });
});
