import type { ChordSpec, Fraction, MeasureSpec, VoiceEventSpec } from "@score-linter/score-model";
import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { mergeableTie } from "../src/rules/mergeableTie.ts";
import { restGrouping } from "../src/rules/restGrouping.ts";
import { runRule } from "./helpers.ts";

const WHOLE = { numerator: 1, denominator: 1 };
const HALF = { numerator: 1, denominator: 2 };
const DOTTED_HALF = { numerator: 3, denominator: 4 };
const QUARTER = { numerator: 1, denominator: 4 };
const DOTTED_QUARTER = { numerator: 3, denominator: 8 };
const EIGHTH = { numerator: 1, denominator: 8 };
const TRIPLET_EIGHTH = { numerator: 1, denominator: 12 };

const rest = (tick: number, duration: Fraction, tuplet = false): VoiceEventSpec => ({
  tick,
  duration,
  tuplet,
});
const note = { pitch: 60, tpc: 14, line: 0, accidentalShown: false };
const chord = (tick: number, duration: Fraction, extra: Partial<ChordSpec> = {}): ChordSpec => ({
  tick,
  duration,
  notes: [note],
  ...extra,
});

const rests = (
  events: { chords?: ChordSpec[]; rests?: VoiceEventSpec[] },
  sig: [number, number] = [4, 4],
) =>
  runRule(
    restGrouping,
    buildScore({ measures: [{ timeSignature: sig }] satisfies MeasureSpec[], ...events }),
  );

describe("rest-grouping", () => {
  it("4/4 の 2 拍目から 2 拍の休符は、3 拍目の頭を隠すので info で指摘する", () => {
    const issues = rests({
      chords: [chord(0, QUARTER), chord(1440, QUARTER)],
      rests: [rest(480, HALF)],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { tick: 480 } });
    expect(issues[0]?.message).toContain("4分休符+4分休符");
  });

  it("4/4 の 1 拍目と 3 拍目からの 2 分休符、小節全体の休符は指摘しない", () => {
    expect(rests({ rests: [rest(0, HALF)], chords: [chord(960, HALF)] })).toEqual([]);
    expect(rests({ chords: [chord(0, HALF)], rests: [rest(960, HALF)] })).toEqual([]);
    expect(rests({ rests: [rest(0, WHOLE)] })).toEqual([]);
  });

  it("4/4 の付点 2 分休符は小節の半分を越えるので指摘する", () => {
    expect(rests({ rests: [rest(0, DOTTED_HALF)], chords: [chord(1440, QUARTER)] })).toHaveLength(
      1,
    );
  });

  it("拍の途中から次の拍へまたぐ休符を指摘する", () => {
    const issues = rests({
      chords: [chord(0, EIGHTH), chord(720, EIGHTH), chord(960, HALF)],
      rests: [rest(240, QUARTER)],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ at: { tick: 240 } });
  });

  it("同じ拍の中の休符を 1 つにまとめられれば指摘する", () => {
    const issues = rests({
      chords: [chord(0, QUARTER), chord(960, HALF)],
      rests: [rest(480, EIGHTH), rest(720, EIGHTH)],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ at: { tick: 480 }, detail: { mergedTicks: 480 } });
    expect(issues[0]?.message).toContain("4分休符");
  });

  it("小節の半分を埋める休符は 2 分休符に、小節全体を埋める休符は 1 つにまとめる提案を 1 件だけ出す", () => {
    const half = rests({
      rests: [rest(0, QUARTER), rest(480, QUARTER)],
      chords: [chord(960, HALF)],
    });
    expect(half).toHaveLength(1);
    expect(half[0]?.detail).toMatchObject({ mergedTicks: 960 });

    const whole = rests({
      rests: [rest(0, QUARTER), rest(480, QUARTER), rest(960, QUARTER), rest(1440, QUARTER)],
    });
    expect(whole).toHaveLength(1);
    expect(whole[0]?.detail).toMatchObject({ mergedTicks: 1920 });
  });

  it("3/4 では 2・3 拍目の休符をまとめない（小節の半分が無い）", () => {
    expect(
      rests(
        { chords: [chord(0, QUARTER)], rests: [rest(480, QUARTER), rest(960, QUARTER)] },
        [3, 4],
      ),
    ).toEqual([]);
  });

  it("6/8 の 1 拍（付点 4 分）を埋める 8 分休符 3 つはまとめる", () => {
    const issues = rests(
      {
        rests: [rest(0, EIGHTH), rest(240, EIGHTH), rest(480, EIGHTH)],
        chords: [chord(720, DOTTED_QUARTER)],
      },
      [6, 8],
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.detail).toMatchObject({ mergedTicks: 720 });
  });

  it("連符の休符は見ない", () => {
    expect(
      rests({
        chords: [chord(0, QUARTER), chord(960, HALF)],
        rests: [
          rest(480, TRIPLET_EIGHTH, true),
          rest(640, TRIPLET_EIGHTH, true),
          rest(800, TRIPLET_EIGHTH, true),
        ],
      }),
    ).toEqual([]);
  });
});

describe("mergeable-tie", () => {
  const tied = (
    chords: ChordSpec[],
    tie: [number, number],
    sig: [number, number] = [4, 4],
    extra: { annotations?: { staff: number; tick: number; text: string; kind: "dynamic" }[] } = {},
  ) =>
    runRule(
      mergeableTie,
      buildScore({
        measures: [{ timeSignature: sig }],
        chords,
        ties: [{ startTick: tie[0], endTick: tie[1], startPitch: 60, endPitch: 60 }],
        ...extra,
      }),
    );

  it("拍頭の 8 分音符 2 つのタイは 4 分音符にまとめられるので info で指摘する", () => {
    const issues = tied([chord(0, EIGHTH), chord(240, EIGHTH), chord(480, DOTTED_HALF)], [0, 240]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { tick: 0 },
      detail: { mergedTicks: 480 },
    });
    expect(issues[0]?.message).toContain("4分音符");
  });

  it("まとめると拍の骨格を隠すタイは指摘しない", () => {
    // 2 拍目の 4 分 ⌣ 8 分 → 付点 4 分は 3 拍目の頭を隠す
    expect(
      tied(
        [chord(0, QUARTER), chord(480, QUARTER), chord(960, EIGHTH), chord(1200, DOTTED_QUARTER)],
        [480, 960],
      ),
    ).toEqual([]);
  });

  it("まとめた長さが標準の音価にならなければ指摘しない", () => {
    // 4 分 ⌣ 付点 4 分 = 5/8
    expect(
      tied([chord(0, QUARTER), chord(480, DOTTED_QUARTER), chord(1200, DOTTED_QUARTER)], [0, 480]),
    ).toEqual([]);
  });

  it("後ろの音にアーティキュレーションや強弱記号があれば指摘しない", () => {
    expect(
      tied(
        [
          chord(0, EIGHTH),
          chord(240, EIGHTH, { articulations: ["Staccato"] }),
          chord(480, DOTTED_HALF),
        ],
        [0, 240],
      ),
    ).toEqual([]);
    expect(
      tied([chord(0, EIGHTH), chord(240, EIGHTH), chord(480, DOTTED_HALF)], [0, 240], [4, 4], {
        annotations: [{ staff: 0, tick: 240, text: "p", kind: "dynamic" }],
      }),
    ).toEqual([]);
  });

  it("和音の一部の音だけのタイは指摘しない", () => {
    const two = [note, { ...note, pitch: 64 }];
    expect(
      tied(
        [
          chord(0, EIGHTH, { notes: two }),
          chord(240, EIGHTH, { notes: two }),
          chord(480, DOTTED_HALF),
        ],
        [0, 240],
      ),
    ).toEqual([]);
  });
});
