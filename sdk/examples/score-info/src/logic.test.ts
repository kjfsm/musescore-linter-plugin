import type { Chord, Measure, Note, Score, Segment } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it, vi } from "vitest";
import { collectInfo, run } from "./logic.js";

function chord(notes: Note[]): Chord {
  return { name: "Chord", notes } as unknown as Chord;
}

function note(): Note {
  return { name: "Note" } as unknown as Note;
}

function buildScore(meta: Record<string, string>): Score {
  // 1 measure with 1 segment containing one chord with 2 notes on track 0.
  const c = chord([note(), note()]);
  const seg = {
    elementAt: (track: number) => (track === 0 ? c : null),
    nextInMeasure: null,
  } as unknown as Segment;
  const measure = {
    firstSegment: seg,
    nextMeasure: null,
  } as unknown as Measure;
  return {
    firstMeasure: measure,
    ntracks: 1,
    selection: null,
    metaTag: (tag: string) => meta[tag] ?? "",
  } as unknown as Score;
}

describe("collectInfo", () => {
  it("collects metadata and counts", () => {
    const score = buildScore({ workTitle: "Sonata", composer: "Bach" });
    expect(collectInfo(score)).toEqual({
      title: "Sonata",
      composer: "Bach",
      measures: 1,
      chords: 1,
      notes: 2,
    });
  });

  it("turns empty meta tags into undefined", () => {
    const score = buildScore({});
    const info = collectInfo(score);
    expect(info.title).toBeUndefined();
    expect(info.composer).toBeUndefined();
  });
});

describe("run", () => {
  it("logs '(untitled)' / '(unknown)' when meta tags are empty", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    run(buildScore({}));
    expect(log).toHaveBeenCalledWith("title: (untitled)");
    expect(log).toHaveBeenCalledWith("composer: (unknown)");
    expect(log).toHaveBeenCalledWith("measures: 1");
    expect(log).toHaveBeenCalledWith("chords: 1");
    expect(log).toHaveBeenCalledWith("notes: 2");
    log.mockRestore();
  });

  it("handles null score", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    run(null);
    expect(log).toHaveBeenCalledWith("no score is open");
    log.mockRestore();
  });
});
