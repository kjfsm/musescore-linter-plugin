import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { duplicateSlur } from "../src/rules/duplicateSlur.ts";
import { slurOnRest } from "../src/rules/slurOnRest.ts";
import { slurSamePitch } from "../src/rules/slurSamePitch.ts";
import { slurSingleNote } from "../src/rules/slurSingleNote.ts";
import { slurTieEndpoint } from "../src/rules/slurTieEndpoint.ts";
import { tiePitchMismatch } from "../src/rules/tiePitchMismatch.ts";
import { runRule } from "./helpers.ts";

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

const note = (pitch: number) => ({ pitch, tpc: 14, line: 0, accidentalShown: false });

describe("slur-tie-endpoint", () => {
  // 0: C ⌒ 480: C（タイ）、960: D
  const tied = (slur: { startTick: number; endTick: number }) =>
    buildScore({
      chords: [
        { tick: 0, notes: [note(60)] },
        { tick: 480, notes: [note(60)] },
        { tick: 960, notes: [note(62)] },
      ],
      ties: [{ startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
      slurs: [slur],
    });

  it("タイの最初の音で終わるスラーを指摘する", () => {
    const score = buildScore({
      chords: [
        { tick: 0, notes: [note(62)] },
        { tick: 480, notes: [note(60)] },
        { tick: 960, notes: [note(60)] },
      ],
      ties: [{ startTick: 480, endTick: 960, startPitch: 60, endPitch: 60 }],
      slurs: [{ startTick: 0, endTick: 480 }],
    });
    const issues = runRule(slurTieEndpoint, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { staff: 0, tick: 480 } });
    expect(issues[0]?.detail).toMatchObject({ endpoint: "end" });
  });

  it("タイで続く音から始まるスラーを指摘する", () => {
    const issues = runRule(slurTieEndpoint, tied({ startTick: 480, endTick: 960 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ at: { tick: 480 }, detail: { endpoint: "start" } });
  });

  it("タイの最初の音から始まり、タイの外で終わるスラーは指摘しない", () => {
    expect(runRule(slurTieEndpoint, tied({ startTick: 0, endTick: 960 }))).toEqual([]);
  });

  it("別の声部のタイは見ない", () => {
    const score = buildScore({
      chords: [
        { tick: 0, notes: [note(62)] },
        { tick: 480, notes: [note(60)] },
        { voice: 1, tick: 480, notes: [note(48)] },
        { voice: 1, tick: 960, notes: [note(48)] },
      ],
      ties: [{ voice: 1, startTick: 480, endTick: 960, startPitch: 48, endPitch: 48 }],
      slurs: [{ startTick: 0, endTick: 480 }],
    });
    expect(runRule(slurTieEndpoint, score)).toEqual([]);
  });
});

describe("slur-same-pitch", () => {
  const twoNotes = (second: { pitch: number; articulations?: string[] }) =>
    buildScore({
      chords: [
        { tick: 0, notes: [note(60)] },
        { tick: 480, notes: [note(second.pitch)], articulations: second.articulations ?? [] },
      ],
      slurs: [{ startTick: 0, endTick: 480 }],
    });

  it("同じ音高の 2 音だけを結ぶスラーを warning で指摘する", () => {
    const issues = runRule(slurSamePitch, twoNotes({ pitch: 60 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", at: { staff: 0, tick: 0 } });
  });

  it("音高が違えば指摘しない", () => {
    expect(runRule(slurSamePitch, twoNotes({ pitch: 62 }))).toEqual([]);
  });

  it("アーティキュレーションが付いていればポルタートとして指摘しない", () => {
    expect(runRule(slurSamePitch, twoNotes({ pitch: 60, articulations: ["Staccato"] }))).toEqual(
      [],
    );
  });

  it("3 音以上に掛かるスラーは指摘しない", () => {
    const score = buildScore({
      chords: [
        { tick: 0, notes: [note(60)] },
        { tick: 240, notes: [note(60)] },
        { tick: 480, notes: [note(60)] },
      ],
      slurs: [{ startTick: 0, endTick: 480 }],
    });
    expect(runRule(slurSamePitch, score)).toEqual([]);
  });

  it("既にタイで結ばれている 2 音は指摘しない", () => {
    const score = buildScore({
      chords: [
        { tick: 0, notes: [note(60)] },
        { tick: 480, notes: [note(60)] },
      ],
      ties: [{ startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
      slurs: [{ startTick: 0, endTick: 480 }],
    });
    expect(runRule(slurSamePitch, score)).toEqual([]);
  });
});

describe("duplicate-slur", () => {
  it("同じ声部の同じ範囲に 2 本あるスラーを 1 件指摘する", () => {
    const score = buildScore({
      chords: [{ tick: 0 }, { tick: 480 }],
      slurs: [
        { startTick: 0, endTick: 480 },
        { startTick: 0, endTick: 480 },
      ],
    });
    const issues = runRule(duplicateSlur, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { staff: 0, tick: 0 } });
  });

  it("声部が違えば重複ではない", () => {
    const score = buildScore({
      chords: [{ tick: 0 }, { tick: 480 }],
      slurs: [
        { startTick: 0, endTick: 480 },
        { voice: 1, startTick: 0, endTick: 480 },
      ],
    });
    expect(runRule(duplicateSlur, score)).toEqual([]);
  });
});

describe("slur-tie-endpoint（和音）", () => {
  it("和音の一部だけがタイで続く音から始まるスラーは指摘しない", () => {
    const score = buildScore({
      chords: [
        { tick: 0, notes: [note(60)] },
        { tick: 480, notes: [note(60), note(64)] },
        { tick: 960, notes: [note(62)] },
      ],
      ties: [{ startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
      slurs: [{ startTick: 480, endTick: 960 }],
    });
    expect(runRule(slurTieEndpoint, score)).toEqual([]);
  });
});
