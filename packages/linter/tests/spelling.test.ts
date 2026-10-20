import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import {
  enharmonicSpelling,
  extremeSpelling,
  keySignature,
  redundantAccidental,
} from "../src/rules/spelling.js";
import { runRule } from "./helpers.js";

const fSharp = (accidentalShown = true) => ({ pitch: 66, tpc: 20, line: 5, accidentalShown });
const gFlat = { pitch: 66, tpc: 8, line: 4, accidentalShown: true };
const fNatural = (accidentalShown = false) => ({ pitch: 65, tpc: 13, line: 5, accidentalShown });

describe("enharmonic-spelling", () => {
  it("同じパートの同じ位置で同じ音高の綴りが違えば info で指摘する", () => {
    const score = buildScore({
      chords: [
        { voice: 0, tick: 0, notes: [fSharp()] },
        { voice: 1, tick: 0, notes: [gFlat] },
      ],
    });
    const issues = runRule(enharmonicSpelling, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { staff: 0, tick: 0 } });
    expect(issues[0]?.detail).toMatchObject({ spellings: ["F#", "Gb"] });
  });

  it("移調が分からないのでパートをまたいでは比べない", () => {
    const score = buildScore({
      parts: [{}, {}],
      chords: [
        { staff: 0, tick: 0, notes: [fSharp()] },
        { staff: 1, tick: 0, notes: [gFlat] },
      ],
    });
    expect(runRule(enharmonicSpelling, score)).toEqual([]);
  });

  it("同じ声部の同じ小節で続く同じ音高の綴りが違えば指摘する", () => {
    const score = buildScore({
      chords: [
        { tick: 0, notes: [fSharp()] },
        { tick: 480, notes: [gFlat] },
      ],
    });
    const issues = runRule(enharmonicSpelling, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ at: { tick: 480 } });
  });

  it("小節をまたいだ書き換えは転調の書き方として指摘しない", () => {
    const score = buildScore({
      measures: [{}, {}],
      chords: [
        { tick: 1440, notes: [fSharp()] },
        { tick: 1920, notes: [gFlat] },
      ],
    });
    expect(runRule(enharmonicSpelling, score)).toEqual([]);
  });
});

describe("redundant-accidental", () => {
  it("同じ小節で既に有効な臨時記号をもう一度付けていれば info で指摘する", () => {
    const score = buildScore({
      chords: [
        { tick: 0, notes: [fSharp()] },
        { tick: 480, notes: [fSharp()] },
      ],
    });
    const issues = runRule(redundantAccidental, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { staff: 0, tick: 480 } });
  });

  it("別の声部で付いた臨時記号も同じ譜表なら有効とみなす", () => {
    const score = buildScore({
      chords: [
        { voice: 1, tick: 0, notes: [fSharp()] },
        { voice: 0, tick: 480, notes: [fSharp()] },
      ],
    });
    expect(runRule(redundantAccidental, score)).toHaveLength(1);
  });

  it("記号の無い音（調号で効いている変化）のあとの臨時記号は親切記号とみなして指摘しない", () => {
    const score = buildScore({
      chords: [
        { tick: 0, notes: [fSharp(false)] },
        { tick: 480, notes: [fSharp()] },
      ],
    });
    expect(runRule(redundantAccidental, score)).toEqual([]);
  });

  it("変化が変わったあとの臨時記号は必要なので指摘しない", () => {
    const score = buildScore({
      chords: [
        { tick: 0, notes: [fSharp()] },
        { tick: 480, notes: [fNatural(true)] },
        { tick: 960, notes: [fSharp()] },
      ],
    });
    expect(runRule(redundantAccidental, score)).toEqual([]);
  });

  it("小節が変われば臨時記号は打ち消される", () => {
    const score = buildScore({
      measures: [{}, {}],
      chords: [
        { tick: 0, notes: [fSharp()] },
        { tick: 1920, notes: [fSharp()] },
      ],
    });
    expect(runRule(redundantAccidental, score)).toEqual([]);
  });

  it("タイで小節線を越えた音は、その小節のあとの音に臨時記号を持ち越さない", () => {
    const score = buildScore({
      measures: [{}, {}],
      chords: [
        { tick: 1440, notes: [fSharp()] },
        { tick: 1920, notes: [fSharp(false)] },
        { tick: 2400, notes: [fSharp()] },
      ],
      ties: [{ startTick: 1440, endTick: 1920, startPitch: 66, endPitch: 66 }],
    });
    expect(runRule(redundantAccidental, score)).toEqual([]);
  });
});

describe("extreme-spelling", () => {
  const withKey = (fifths: number, tpc: number) =>
    buildScore({
      keySignatures: [{ tick: 0, fifths }],
      chords: [{ tick: 0, notes: [{ pitch: 60, tpc, line: 0, accidentalShown: true }] }],
    });

  it("ハ長調の Cb・E#・重嬰を info で指摘する", () => {
    expect(runRule(extremeSpelling, withKey(0, 7))).toHaveLength(1); // Cb
    expect(runRule(extremeSpelling, withKey(0, 25))).toHaveLength(1); // E#
    expect(runRule(extremeSpelling, withKey(0, 27))[0]).toMatchObject({ severity: "info" }); // F##
  });

  it("調から近い綴りは指摘しない", () => {
    expect(runRule(extremeSpelling, withKey(0, 22))).toEqual([]); // ハ長調の G#
    expect(runRule(extremeSpelling, withKey(4, 26))).toEqual([]); // ホ長調の B#
    expect(runRule(extremeSpelling, withKey(-5, 7))).toEqual([]); // 変ニ長調の Cb
  });

  it("調号の分からない譜表では判定しない", () => {
    const score = buildScore({
      chords: [{ tick: 0, notes: [{ pitch: 59, tpc: 7, line: 0, accidentalShown: true }] }],
    });
    expect(runRule(extremeSpelling, score)).toEqual([]);
  });
});

describe("key-signature", () => {
  it("7 つの調号を info で指摘する", () => {
    const issues = runRule(keySignature, buildScore({ keySignatures: [{ tick: 0, fifths: -7 }] }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { staff: 0, tick: 0 } });
  });

  it("前と同じ調号への変更を指摘する", () => {
    const score = buildScore({
      measures: [{}, {}],
      keySignatures: [
        { tick: 0, fifths: 2 },
        { tick: 1920, fifths: 2 },
      ],
    });
    const issues = runRule(keySignature, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ at: { measure: 2, tick: 1920 } });
  });

  it("6 つまでの調号と、違う調号への変更は指摘しない", () => {
    const score = buildScore({
      measures: [{}, {}],
      keySignatures: [
        { tick: 0, fifths: 6 },
        { tick: 1920, fifths: -6 },
      ],
    });
    expect(runRule(keySignature, score)).toEqual([]);
  });
});
