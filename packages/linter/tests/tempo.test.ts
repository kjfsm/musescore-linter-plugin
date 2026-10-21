import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { duplicateTempo } from "../src/rules/duplicateTempo.ts";
import { openingTempo } from "../src/rules/openingTempo.ts";
import { tempoBarline } from "../src/rules/tempoBarline.ts";
import { tempoChangeResolution } from "../src/rules/tempoChangeResolution.ts";
import { tempoWithoutBpm } from "../src/rules/tempoWithoutBpm.ts";
import { cleanScore, runRule } from "./helpers.ts";

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

describe("パートと楽譜全体に付いたテンポの注記", () => {
  it("tempo-without-bpm はパートの注記をパートの最初の譜表に、楽譜全体の注記を譜表なしで報告する", () => {
    const score = cleanScore({
      annotations: [
        { partId: "P2", measure: 2, tick: 480, text: "Adagio", kind: "tempo" },
        { measure: 3, tick: 960, text: "Presto", kind: "tempo" },
      ],
    });
    const issues = runRule(tempoWithoutBpm, score);
    expect(issues.map((i) => i.at)).toEqual([
      { partId: "P2", staff: 1, measure: 2, tick: 480 },
      { partId: null, staff: null, measure: 3, tick: 960 },
    ]);
  });

  it("tempo-change-resolution はパートの注記も楽譜全体の注記も見て、どちらでも解除できる", () => {
    const later = { staff: 0, tick: 1920, measure: 3 };
    const partRit = cleanScore({
      annotations: [{ partId: "P2", measure: 2, tick: 480, text: "rit." }],
      chords: [later],
    });
    expect(runRule(tempoChangeResolution, partRit)[0]?.at).toMatchObject({ staff: 1, measure: 2 });

    const scoreRit = cleanScore({
      annotations: [{ measure: 2, tick: 480, text: "rit." }],
      chords: [later],
    });
    expect(runRule(tempoChangeResolution, scoreRit)[0]?.at).toMatchObject({
      staff: null,
      measure: 2,
    });

    const resolvedByScore = cleanScore({
      annotations: [
        { partId: "P2", measure: 2, tick: 480, text: "rit." },
        { measure: 2, tick: 960, text: "a tempo" },
      ],
      chords: [later],
    });
    expect(runRule(tempoChangeResolution, resolvedByScore)).toEqual([]);
  });
});

describe("duplicate-tempo", () => {
  const text = (measure: number, t: string, staff = 0) => ({
    staff,
    measure,
    tick: (measure - 1) * 480,
    text: t,
  });

  it("同じ位置に同じテンポ表記を重ねていれば info で指摘する", () => {
    const score = cleanScore({ annotations: [tempoAt(1, "Allegro", 120)] });
    expect(runRule(duplicateTempo, score)).toMatchObject([{ severity: "info", at: { tick: 0 } }]);
  });

  it("同じ位置で BPM の違うテンポ表記を warning で指摘する", () => {
    const score = cleanScore({ annotations: [tempoAt(1, "Fast", 140)] });
    const issues = runRule(duplicateTempo, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", at: { measure: 1, tick: 0 } });
  });

  it("テンポの変化を挟まずに同じ BPM を言い直すと info で指摘する", () => {
    const score = cleanScore({ annotations: [tempoAt(5, "♩ = 120", 120)] });
    const issues = runRule(duplicateTempo, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { measure: 5 },
      detail: { previousMeasure: 1 },
    });
  });

  it("rit. のあとの同じ BPM は a tempo として指摘しない", () => {
    const score = cleanScore({ annotations: [text(3, "rit."), tempoAt(5, "♩ = 120", 120)] });
    expect(runRule(duplicateTempo, score)).toEqual([]);
  });

  it("速度語が変われば同じ BPM でも指摘しない", () => {
    const score = cleanScore({ annotations: [tempoAt(5, "Maestoso", 120)] });
    expect(runRule(duplicateTempo, score)).toEqual([]);
  });

  it("解除されないまま同じ譜表に重ねて書いた rit. を info で指摘する", () => {
    const score = cleanScore({
      annotations: [text(3, "rit."), text(4, "rit."), tempoAt(6, "a tempo", 120)],
    });
    const issues = runRule(duplicateTempo, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { staff: 0, measure: 4 } });
  });

  it("楽譜全体やパートに付いた rit. の重ね書きも、付いた先ごとに比べる", () => {
    const at = (measure: number, extra: { partId?: string }) => ({
      ...extra,
      measure,
      tick: (measure - 1) * 480,
      text: "rit.",
    });
    const score = cleanScore({
      annotations: [at(3, {}), at(4, {}), at(3, { partId: "P2" }), at(4, { partId: "P2" })],
    });
    const issues = runRule(duplicateTempo, score);
    expect(issues.map((i) => i.at.staff)).toEqual([null, 1]);
  });

  it("別の譜表に書いた rit. や、段階を書き分けたテンポ変化は指摘しない", () => {
    const score = cleanScore({
      annotations: [
        text(3, "rit."),
        text(4, "rit.", 1),
        text(5, "molto rit."),
        tempoAt(6, "a tempo", 120),
      ],
    });
    expect(runRule(duplicateTempo, score)).toEqual([]);
  });
});
