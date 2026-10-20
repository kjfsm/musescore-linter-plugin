import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import {
  openingTempo,
  tempoBarline,
  tempoChangeResolution,
  tempoWithoutBpm,
} from "../src/rules/tempo.js";
import { cleanScore, runRule } from "./helpers.js";

/** 1 小節 480 tick として、小節 n（1 始まり）の頭に置く。 */
const tempoAt = (measure: number, text: string, bpm: number) => ({
  staff: 0,
  measure,
  tick: (measure - 1) * 480,
  text,
  kind: "tempo" as const,
  bpm,
});

describe("opening-tempo", () => {
  it("冒頭にテンポ表記が無ければ error を 1 件出す", () => {
    const score = buildScore({
      parts: [{ name: "Vn1" }],
      chords: [{ tick: 0 }],
      annotations: [{ staff: 0, tick: 0, text: "f", kind: "dynamic" }],
    });
    const issues = runRule(openingTempo, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("error");
  });

  it("楽譜全体に付いたテンポ表記があれば指摘しない", () => {
    const score = buildScore({
      parts: [{ name: "Vn1" }],
      chords: [{ tick: 0 }],
      annotations: [{ tick: 0, text: "Allegro", kind: "tempo", bpm: 120 }],
    });
    expect(runRule(openingTempo, score)).toEqual([]);
  });
});

describe("tempo-barline", () => {
  it("テンポ変更の前の小節に複縦線が無ければ info を出す", () => {
    const score = cleanScore({
      chords: [{ tick: 480 }, { tick: 960, measure: 3 }],
      annotations: [tempoAt(3, "Presto", 180)],
    });
    const issues = runRule(tempoBarline, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { staff: 0, measure: 2 } });
  });

  it("テンポ変更の前の小節に複縦線があれば指摘しない", () => {
    const score = cleanScore({
      chords: [{ tick: 480 }, { tick: 960, measure: 3 }],
      barlines: [{ tick: 958, measure: 2, kind: "double" }],
      annotations: [tempoAt(3, "Presto", 180)],
    });
    expect(runRule(tempoBarline, score)).toEqual([]);
  });

  it("BPM が変わらないテンポ表記の繰り返しは指摘しない", () => {
    const score = cleanScore({
      chords: [{ tick: 480 }, { tick: 960, measure: 3 }],
      annotations: [tempoAt(3, "Allegro", 120)],
    });
    expect(runRule(tempoBarline, score)).toEqual([]);
  });

  it("テンポ変更が 2 回あり、どちらも複縦線が無ければ 2 件出す", () => {
    const score = cleanScore({
      chords: [
        { tick: 480 },
        { tick: 960, measure: 3 },
        { tick: 1440, measure: 4 },
        { tick: 1920, measure: 5 },
      ],
      annotations: [tempoAt(3, "Presto", 180), tempoAt(5, "Andante", 90)],
    });
    const issues = runRule(tempoBarline, score);
    expect(issues.map((i) => i.at.measure)).toEqual([2, 4]);
  });
});

describe("tempo-without-bpm", () => {
  it("BPM が無いテンポ表記に警告する", () => {
    const score = buildScore({
      parts: [{ name: "Vn1" }],
      chords: [{ tick: 0 }],
      annotations: [{ staff: 0, tick: 0, text: "Allegro", kind: "tempo" }],
    });
    const issues = runRule(tempoWithoutBpm, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", at: { partId: "P1", staff: 0 } });
  });

  it("BPM があれば指摘しない", () => {
    const score = buildScore({
      annotations: [{ staff: 0, tick: 0, text: "Allegro", kind: "tempo", bpm: 120 }],
    });
    expect(runRule(tempoWithoutBpm, score)).toEqual([]);
  });

  it("楽譜全体に付いた BPM なしのテンポ表記も、譜表なしの位置で検出する", () => {
    const score = buildScore({ annotations: [{ tick: 0, text: "Lento", kind: "tempo" }] });
    const issues = runRule(tempoWithoutBpm, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.at.staff).toBeNull();
  });

  // 壊れた値を入れてくるソースがあっても、BPM ありとして素通りさせない
  it("BPM が NaN でも検出する", () => {
    const score = buildScore({
      annotations: [{ staff: 0, tick: 0, text: "Allegro", kind: "tempo", bpm: Number.NaN }],
    });
    expect(runRule(tempoWithoutBpm, score)).toHaveLength(1);
  });
});

describe("tempo-change-resolution", () => {
  const rit = { staff: 0, measure: 2, tick: 480, text: "rit." };

  it("rit. が曲中で解除されないまま続けば警告する", () => {
    // rit. より後に音楽（小節 3）があるので、曲尾の最終 rit. ではない
    const score = cleanScore({
      annotations: [rit],
      chords: [{ staff: 0, tick: 1920, measure: 3 }],
    });
    const issues = runRule(tempoChangeResolution, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "warning",
      at: { staff: 0, measure: 2, tick: 480 },
      detail: { label: "rit." },
    });
  });

  it("曲尾（最後の音楽の小節）の rit. は指摘しない", () => {
    const score = cleanScore({
      annotations: [rit],
      chords: [{ staff: 0, tick: 480, measure: 2 }],
    });
    expect(runRule(tempoChangeResolution, score)).toEqual([]);
  });

  it("rit. → a tempo で解除されていれば指摘しない", () => {
    const score = cleanScore({
      annotations: [rit, { staff: 0, measure: 3, tick: 960, text: "a tempo" }],
    });
    expect(runRule(tempoChangeResolution, score)).toEqual([]);
  });

  it("accel. の後に新しいテンポ表記（BPM あり）が来れば解除とみなす", () => {
    const score = cleanScore({
      annotations: [{ staff: 0, measure: 2, tick: 480, text: "accel." }, tempoAt(3, "Presto", 150)],
    });
    expect(runRule(tempoChangeResolution, score)).toEqual([]);
  });
});
