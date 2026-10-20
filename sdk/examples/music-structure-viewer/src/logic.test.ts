import type { BarLineTypeEnum, NoteTypeEnum, Score } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { buildStructure, midiToName } from "./logic.js";

// 実機では MuseScore が渡す enum。テストでは使うメンバだけのモックで代用する。
const noteType = { NORMAL: 0 } as unknown as NoteTypeEnum;
const barLineType = { NORMAL: 0 } as unknown as BarLineTypeEnum;

describe("midiToName", () => {
  it("converts standard pitches", () => {
    expect(midiToName(60)).toBe("C4");
    expect(midiToName(69)).toBe("A4");
    expect(midiToName(61)).toBe("C#4");
    expect(midiToName(72)).toBe("C5");
    expect(midiToName(48)).toBe("C3");
    expect(midiToName(21)).toBe("A0");
  });
});

describe("buildStructure", () => {
  it("returns error JSON when score is null", () => {
    const result = buildStructure(null, noteType, barLineType);
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("returns valid structure for empty score", () => {
    const score = {
      title: "Test Score",
      composer: "Test Composer",
      lyricist: "",
      nstaves: 1,
      nmeasures: 0,
      ntracks: 4,
      duration: 0,
      keysig: 0,
      parts: [],
      staves: [],
      firstMeasure: null,
      selection: null,
      metaTag: (_tag: string) => "",
    } as unknown as Score;

    const result = buildStructure(score, noteType, barLineType);
    const parsed = JSON.parse(result) as {
      score: { title: string; subtitle: string; nstaves: number };
      parts: unknown[];
      measures: unknown[];
    };

    expect(parsed.score.title).toBe("Test Score");
    expect(parsed.score.subtitle).toBe("");
    expect(parsed.score.nstaves).toBe(1);
    expect(parsed.parts).toEqual([]);
    expect(parsed.measures).toEqual([]);
  });

  it("falls back to metaTag for title", () => {
    const score = {
      title: "",
      composer: "",
      lyricist: "",
      nstaves: 0,
      nmeasures: 0,
      ntracks: 0,
      duration: 0,
      keysig: 0,
      parts: [],
      staves: [],
      firstMeasure: null,
      selection: null,
      metaTag: (tag: string) => (tag === "workTitle" ? "Meta Title" : ""),
    } as unknown as Score;

    const result = buildStructure(score, noteType, barLineType);
    const parsed = JSON.parse(result) as { score: { title: string } };
    expect(parsed.score.title).toBe("Meta Title");
  });

  it("includes part information", () => {
    const score = {
      title: "",
      composer: "",
      lyricist: "",
      nstaves: 1,
      nmeasures: 0,
      ntracks: 4,
      duration: 0,
      keysig: 0,
      parts: [
        {
          partName: "Violin",
          longName: "Violin",
          shortName: "Vl.",
          instrumentId: "strings.violin",
          staves: [{}],
        },
      ],
      staves: [],
      firstMeasure: null,
      selection: null,
      metaTag: (_tag: string) => "",
    } as unknown as Score;

    const result = buildStructure(score, noteType, barLineType);
    const parsed = JSON.parse(result) as {
      parts: Array<{ name: string; shortName: string; instrumentId: string; nstaves: number }>;
    };

    expect(parsed.parts).toHaveLength(1);
    expect(parsed.parts[0]?.name).toBe("Violin");
    expect(parsed.parts[0]?.shortName).toBe("Vl.");
    expect(parsed.parts[0]?.instrumentId).toBe("strings.violin");
    expect(parsed.parts[0]?.nstaves).toBe(1);
  });
});
