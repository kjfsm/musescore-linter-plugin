import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { slurOnRest, slurSingleNote, tiePitchMismatch } from "../src/rules/slurTie.js";
import { runRule } from "./helpers.js";

describe("tie-pitch-mismatch", () => {
  const tieOf = (startPitch: number | null, endPitch: number | null) =>
    buildScore({
      measures: [{}],
      chords: [{ tick: 0 }],
      ties: [{ startTick: 0, endTick: 480, startPitch, endPitch }],
    });

  it("異なる音高のタイは warning を 1 件出す", () => {
    const issues = runRule(tiePitchMismatch, tieOf(60, 62));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.at).toMatchObject({ staff: 0, measure: 1, tick: 0 });
    expect(issues[0]?.detail).toEqual({ startPitch: 60, endPitch: 62 });
  });

  it("同じ音高のタイは指摘しない", () => {
    expect(runRule(tiePitchMismatch, tieOf(60, 60))).toHaveLength(0);
  });

  it("端点の音高が不明(null)なら判定しない", () => {
    expect(runRule(tiePitchMismatch, tieOf(60, null))).toHaveLength(0);
  });
});

describe("slur-on-rest", () => {
  it("スラーの開始端点が休符上なら warning を 1 件出す", () => {
    const score = buildScore({
      rests: [{ tick: 0 }],
      chords: [{ tick: 480 }],
      slurs: [{ startTick: 0, endTick: 480 }],
    });
    const issues = runRule(slurOnRest, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
  });

  it("端点が音符上なら指摘しない", () => {
    const score = buildScore({
      chords: [{ tick: 0 }, { tick: 480 }],
      slurs: [{ startTick: 0, endTick: 480 }],
    });
    expect(runRule(slurOnRest, score)).toHaveLength(0);
  });

  it("同 tick に別声部の音符と休符が共存するときは音符を優先して指摘しない", () => {
    const score = buildScore({
      chords: [
        { voice: 0, tick: 0 },
        { voice: 0, tick: 480 },
      ],
      rests: [{ voice: 1, tick: 480 }],
      slurs: [{ startTick: 0, endTick: 480 }],
    });
    expect(runRule(slurOnRest, score)).toHaveLength(0);
  });
});

describe("slur-single-note", () => {
  const slurOf = (endTick: number) =>
    buildScore({ chords: [{ tick: 0 }], slurs: [{ startTick: 0, endTick }] });

  it("単一音スラー(start == end)は info を 1 件出す", () => {
    const issues = runRule(slurSingleNote, slurOf(0));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("info");
  });

  it("複数音スラー(start < end)は指摘しない", () => {
    expect(runRule(slurSingleNote, slurOf(480))).toHaveLength(0);
  });
});
