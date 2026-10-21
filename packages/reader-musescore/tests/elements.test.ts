import type { BarLineTypeName, Chord, Tie } from "@score-linter/musescore-api-types";
import { describe, expect, it } from "vitest";

import { barlineKindOf, dynamicText, notesOf, tiePitches } from "../src/elements.ts";

describe("dynamicText（修飾語付き）", () => {
  it("修飾語の付いた強弱記号でも、記号の部分だけを文字に直す", () => {
    expect(dynamicText("dynamicForte espr.")).toBe("f espr.");
    expect(dynamicText("più dynamicForte")).toBe("più f");
    expect(dynamicText("dynamicMezzodynamicPiano")).toBe("mp");
    expect(dynamicText("dynamicPPP")).toBe("ppp");
  });
});

describe("dynamicText", () => {
  it("SMuFL 名を強弱記号の文字に直す", () => {
    expect(dynamicText("dynamicForte")).toBe("f");
    expect(dynamicText("dynamicPiano")).toBe("p");
    expect(dynamicText("dynamicPPP")).toBe("ppp");
    expect(dynamicText("dynamicFFFF")).toBe("ffff");
    expect(dynamicText("dynamicSforzando")).toBe("sf");
    expect(dynamicText("dynamicNiente")).toBe("n");
    expect(dynamicText("dynamicSforzandoPiano")).toBe("sfp");
  });

  it("連なった SMuFL 名を 1 つの記号に組み立てる", () => {
    expect(dynamicText("dynamicMezzodynamicPiano")).toBe("mp");
    expect(dynamicText("dynamicMezzodynamicForte")).toBe("mf");
  });

  it("SMuFL 名でないテキストはそのまま通す", () => {
    expect(dynamicText("mf")).toBe("mf");
    expect(dynamicText("dolce")).toBe("dolce");
    expect(dynamicText("")).toBe("");
  });

  it("対応表に無い SMuFL 名は名前のまま残す", () => {
    expect(dynamicText("dynamicMezzodynamicUnknown")).toBe("mdynamicUnknown");
  });
});

describe("notesOf", () => {
  it("音高・綴り・譜表上の位置を読み、臨時記号が表示されているかを判定する", () => {
    const chord = {
      notes: [
        { pitch: 66, tpc: 20, line: 5, accidental: { name: "Accidental" } },
        { pitch: 65, tpc: 13, line: 5, accidental: null },
      ],
    } as unknown as Chord;
    expect(notesOf(chord)).toEqual([
      { pitch: 66, tpc: 20, line: 5, accidentalShown: true },
      { pitch: 65, tpc: 13, line: 5, accidentalShown: false },
    ]);
  });

  it("音高が数でない音符は pitch を null にする", () => {
    const chord = {
      notes: [
        { tpc: 14, line: 0, accidental: null },
        { pitch: "C4", tpc: 14, line: 0 },
      ],
    } as unknown as Chord;
    expect(notesOf(chord).map((n) => n.pitch)).toEqual([null, null]);
  });

  it("notes が無い和音は空配列", () => {
    expect(notesOf({} as unknown as Chord)).toEqual([]);
  });
});

describe("tiePitches", () => {
  const tieWith = (start?: number, end?: number): Tie =>
    ({
      name: "Tie",
      startNote: start === undefined ? null : { pitch: start },
      endNote: end === undefined ? null : { pitch: end },
    }) as unknown as Tie;

  it("両端の音高を返す", () => {
    expect(tiePitches(tieWith(60, 60))).toEqual({ startPitch: 60, endPitch: 60 });
    expect(tiePitches(tieWith(60, 62))).toEqual({ startPitch: 60, endPitch: 62 });
  });

  it("端の音符が無ければ両端とも null", () => {
    const none = { startPitch: null, endPitch: null };
    expect(tiePitches(tieWith(60, undefined))).toEqual(none);
    expect(tiePitches(tieWith(undefined, 60))).toEqual(none);
  });

  it("端の音符が音高を持たなければ両端とも null", () => {
    const tie = { startNote: { pitch: 60 }, endNote: {} } as unknown as Tie;
    expect(tiePitches(tie)).toEqual({ startPitch: null, endPitch: null });
  });
});

describe("barlineKindOf", () => {
  const kind = (name: BarLineTypeName) => barlineKindOf(name);

  it("終止線", () => {
    expect(kind("END")).toBe("final");
    expect(kind("REVERSE_END")).toBe("final");
  });

  it("二重線", () => {
    expect(kind("DOUBLE")).toBe("double");
  });

  it("反復記号は開始・終了・両方を区別する", () => {
    expect(kind("START_REPEAT")).toBe("repeat-start");
    expect(kind("END_REPEAT")).toBe("repeat-end");
    expect(kind("END_START_REPEAT")).toBe("repeat-both");
  });

  it("それ以外の小節線は other", () => {
    for (const name of ["NORMAL", "BROKEN", "DOTTED", "HEAVY", "DOUBLE_HEAVY"] as const) {
      expect(kind(name), name).toBe("other");
    }
  });

  it("実行中の版に無い値（null）は other", () => {
    expect(barlineKindOf(null)).toBe("other");
  });
});
