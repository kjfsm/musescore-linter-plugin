import type { MuseScore, Score } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it, vi } from "vitest";
import { run } from "./logic.js";

// 実機では QML が MuseScore オブジェクトを渡す。テストでは使うメンバだけのモックで代用する。
function mockHost(score: Score | null): MuseScore {
  return {
    curScore: score,
    Element: { NOTE: 28 },
    mscoreMajorVersion: 4,
    mscoreMinorVersion: 7,
    log: () => {},
  } as unknown as MuseScore;
}

describe("hello-world plugin", () => {
  it("logs 'no score is open' when score is null", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    run(mockHost(null));
    expect(log).toHaveBeenCalledWith("hello from typescript");
    expect(log).toHaveBeenCalledWith("no score is open");
    log.mockRestore();
  });

  it("logs metadata, selection state, and counts for an empty score", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const score = {
      firstMeasure: null,
      ntracks: 0,
      selection: null,
      metaTag: () => "",
    } as unknown as Score;
    run(mockHost(score));
    expect(log).toHaveBeenCalledWith("hello from typescript");
    expect(log).toHaveBeenCalledWith("title: (untitled)");
    expect(log).toHaveBeenCalledWith("no range selection");
    expect(log).toHaveBeenCalledWith("measures: 0, notes: 0");
    log.mockRestore();
  });
});
