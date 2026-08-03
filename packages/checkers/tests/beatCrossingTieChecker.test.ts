import type { EventSpec, MeasureInfo } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { beatCrossingTieChecker } from "../src/beatCrossingTieChecker.js";
import { buildIR, K } from "./helpers/irBuilder.js";

// この checker は ir.derived を使わないので ensureDerived は不要。
const run = (events: EventSpec[], measures: MeasureInfo[]) =>
  beatCrossingTieChecker.run(buildIR({ parts: [{ partName: "Vn1" }], events, measures }));

/** 音価（全音符 = 1 の分数）。 */
const WHOLE = { numerator: 1, denominator: 1 };
const HALF = { numerator: 1, denominator: 2 };
const QUARTER = { numerator: 1, denominator: 4 };
const EIGHTH = { numerator: 1, denominator: 8 };
const DOTTED_QUARTER = { numerator: 3, denominator: 8 };
const DOTTED_EIGHTH = { numerator: 3, denominator: 16 };
const TRIPLET_EIGHTH = { numerator: 1, denominator: 12 };

const measure = (
  timeSigN: number,
  timeSigD: number,
  overrides: Partial<MeasureInfo> = {},
): MeasureInfo => ({
  measure: 1,
  startTick: 0,
  ticks: (1920 * timeSigN) / timeSigD,
  timeSigN,
  timeSigD,
  ...overrides,
});

const chord = (tick: number, duration: EventSpec["duration"]): EventSpec => ({
  kind: K.CHORD,
  staff: 0,
  voice: 0,
  measure: 1,
  tick,
  duration,
});

describe("beat-crossing-tie", () => {
  it("4/4 の「付点8分+付点8分+8分」で 2 つ目だけを info で検出する", () => {
    const issues = run(
      [chord(0, DOTTED_EIGHTH), chord(360, DOTTED_EIGHTH), chord(720, EIGHTH)],
      [measure(4, 4)],
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].tick).toBe(360);
    expect(issues[0].severity).toBe("info");
    expect(issues[0].ruleId).toBe("beat-crossing-tie");
    expect(issues[0].partName).toBe("Vn1");
    expect(issues[0].message).toContain("Vn1: ");
    expect(issues[0].message).toContain("付点8分音符 → 16分音符+8分音符のタイ");
    expect(issues[0].detail).toMatchObject({
      onsetTicks: 360,
      durationTicks: 360,
      suggestedSplit: [120, 240],
      crossesPrimaryBoundary: false,
      timeSig: "4/4",
    });
  });

  it("4/4 で中央境界（3拍目頭）をまたぐと warning に上がる", () => {
    // 8分(0) + 4分(240) → 240..720 が 480 をまたぐ（info）
    // 8分(720) + 4分(960 の手前 840 から) → 840..1320 が 960 をまたぐ（warning）
    const issues = run([chord(240, QUARTER), chord(840, QUARTER)], [measure(4, 4)]);

    expect(issues).toHaveLength(2);
    expect(issues[0].severity).toBe("info");
    expect(issues[1].severity).toBe("warning");
    expect(issues[1].detail).toMatchObject({ crossesPrimaryBoundary: true });
  });

  it("拍頭から始まる音符は何拍またいでも検出しない", () => {
    const issues = run([chord(0, QUARTER), chord(480, QUARTER), chord(960, HALF)], [measure(4, 4)]);
    expect(issues).toHaveLength(0);
  });

  it("小節全体を覆う全音符は検出しない", () => {
    expect(run([chord(0, WHOLE)], [measure(4, 4)])).toHaveLength(0);
  });

  it("拍境界をまたがない裏拍の音符は検出しない", () => {
    // 240..480 は 480 で終わるので境界をまたいでいない
    expect(run([chord(240, EIGHTH)], [measure(4, 4)])).toHaveLength(0);
  });

  it("6/8 の「付点4分+付点4分」は拍頭なので検出しない", () => {
    expect(
      run([chord(0, DOTTED_QUARTER), chord(720, DOTTED_QUARTER)], [measure(6, 8)]),
    ).toHaveLength(0);
  });

  it("6/8 で 8分裏から始まる付点4分は中央境界をまたぐので warning", () => {
    const issues = run([chord(240, DOTTED_QUARTER)], [measure(6, 8)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].detail).toMatchObject({
      suggestedSplit: [480, 240],
      crossesPrimaryBoundary: true,
      timeSig: "6/8",
    });
  });

  it("3/4 は単純拍子として扱い、2拍目境界またぎを info で検出する", () => {
    const issues = run([chord(240, QUARTER)], [measure(3, 4)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("info");
    expect(issues[0].detail).toMatchObject({ timeSig: "3/4" });
  });

  it("連符は判定対象外", () => {
    // 3連8分（160 tick）を 200 から。240 が境界だが連符ガードで落とす
    expect(run([chord(200, TRIPLET_EIGHTH)], [measure(4, 4)])).toHaveLength(0);
  });

  it("加算拍子（5/8）は判定対象外", () => {
    expect(run([chord(120, QUARTER)], [measure(5, 8)])).toHaveLength(0);
  });

  it("アウフタクト（拍子と実長が食い違う小節）は判定対象外", () => {
    expect(run([chord(120, QUARTER)], [measure(4, 4, { ticks: 480 })])).toHaveLength(0);
  });

  it("meta.measures が無ければ何も検出しない", () => {
    expect(run([chord(360, DOTTED_EIGHTH)], [])).toHaveLength(0);
  });

  it("小節先頭 tick が 0 でない小節でも相対位置で判定する", () => {
    const issues = beatCrossingTieChecker.run(
      buildIR({
        parts: [{ partName: "Vn1" }],
        events: [
          {
            kind: K.CHORD,
            staff: 0,
            voice: 0,
            measure: 3,
            tick: 3840 + 360,
            duration: DOTTED_EIGHTH,
          },
        ],
        measures: [measure(4, 4, { measure: 3, startTick: 3840 })],
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].measure).toBe(3);
    expect(issues[0].detail).toMatchObject({ onsetTicks: 360 });
  });
});
