import type { EngravingItem } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { getAnnotationStaffIdx, getAnnotationText } from "../src/annotations.js";

function makeAnnotation(props: Record<string, unknown>): EngravingItem {
  return { name: "StaffText", ...props } as unknown as EngravingItem;
}

describe("getAnnotationText", () => {
  it("returns plainText when available", () => {
    const ann = makeAnnotation({ plainText: "Hello" });
    expect(getAnnotationText(ann)).toBe("Hello");
  });

  it("prefers plainText over text", () => {
    const ann = makeAnnotation({ plainText: "Plain", text: "<b>Rich</b>" });
    expect(getAnnotationText(ann)).toBe("Plain");
  });

  it("falls back to text when plainText is absent", () => {
    const ann = makeAnnotation({ text: "<b>Bold</b>" });
    expect(getAnnotationText(ann)).toBe("Bold");
  });

  it("strips HTML tags from text", () => {
    const ann = makeAnnotation({ text: '<font face="Edwin">forte</font>' });
    expect(getAnnotationText(ann)).toBe("forte");
  });

  it("returns empty string when neither property is present", () => {
    const ann = makeAnnotation({});
    expect(getAnnotationText(ann)).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    const ann = makeAnnotation({ plainText: "  Allegro  " });
    expect(getAnnotationText(ann)).toBe("Allegro");
  });
});

describe("getAnnotationStaffIdx", () => {
  it("derives staffIdx from track when track >= 0", () => {
    const ann = makeAnnotation({ track: 4, staffIdx: 99 });
    expect(getAnnotationStaffIdx(ann)).toBe(1);
  });

  it("falls back to staffIdx when track is absent", () => {
    const ann = makeAnnotation({ staffIdx: 2 });
    expect(getAnnotationStaffIdx(ann)).toBe(2);
  });

  it("falls back to staffIdx when track is negative", () => {
    const ann = makeAnnotation({ track: -1, staffIdx: 3 });
    expect(getAnnotationStaffIdx(ann)).toBe(3);
  });

  it("returns -1 when both track and staffIdx are absent or negative", () => {
    const ann = makeAnnotation({ staffIdx: -1 });
    expect(getAnnotationStaffIdx(ann)).toBe(-1);
  });

  it("handles track 0 as a valid track (staffIdx 0)", () => {
    const ann = makeAnnotation({ track: 0, staffIdx: 5 });
    expect(getAnnotationStaffIdx(ann)).toBe(0);
  });
});
