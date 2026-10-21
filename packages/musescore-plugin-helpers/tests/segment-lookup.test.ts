import type { Segment } from "@score-linter/musescore-api-types";
import { describe, expect, it } from "vitest";

import { getClefTypeAt, getKeySigAt } from "../src/element-types.ts";

function segmentWith(elements: Record<number, Record<string, unknown>>): Segment {
  return { elementAt: (track: number) => elements[track] ?? null } as unknown as Segment;
}

describe("getClefTypeAt", () => {
  it("譜表のどれかの声部にある音部記号の種類を返す", () => {
    const seg = segmentWith({ 6: { name: "Clef", concertClefType: 3 } });
    expect(getClefTypeAt(seg, 1)).toBe(3);
  });

  // undefined ではなく null。呼び出し側は `=== null` で「無い」を判定する
  it("その譜表に音部記号が無ければ null", () => {
    const seg = segmentWith({ 0: { name: "Clef", concertClefType: 3 }, 4: { name: "Chord" } });
    expect(getClefTypeAt(seg, 1)).toBeNull();
  });
});

describe("getKeySigAt", () => {
  it("譜表のどれかの声部にある調号の実音の調を返す", () => {
    const seg = segmentWith({ 5: { name: "KeySig", actualKey: -2 } });
    expect(getKeySigAt(seg, 1)).toBe(-2);
  });

  it("その譜表に調号が無ければ null", () => {
    expect(getKeySigAt(segmentWith({}), 0)).toBeNull();
  });
});
