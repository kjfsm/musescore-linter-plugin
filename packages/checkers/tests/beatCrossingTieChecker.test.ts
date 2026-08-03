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
    expect(issues[0].message).toBe(
      "Vn1: 1小節目 1拍目+付点8分音符 から始まる付点8分音符が2拍目の頭をまたいでいます。" +
        "16分音符+8分音符のタイに分割することを推奨します",
    );
    expect(issues[0].detail).toMatchObject({
      position: "1拍目+付点8分音符",
      crossedBeats: "2拍目の頭",
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

  it("同じ小節に同じ音価の違反が並んでもメッセージで区別できる", () => {
    // 「付点8分+付点8分+8分」を前半・後半で繰り返す。違反は onset 360 と 1320
    const issues = run(
      [
        chord(0, DOTTED_EIGHTH),
        chord(360, DOTTED_EIGHTH),
        chord(720, EIGHTH),
        chord(960, DOTTED_EIGHTH),
        chord(1320, DOTTED_EIGHTH),
        chord(1680, EIGHTH),
      ],
      [measure(4, 4)],
    );

    expect(issues).toHaveLength(2);
    expect(issues.map((i) => i.detail?.position)).toEqual([
      "1拍目+付点8分音符",
      "3拍目+付点8分音符",
    ]);
    expect(issues.map((i) => i.detail?.crossedBeats)).toEqual(["2拍目の頭", "4拍目の頭"]);
    expect(issues[0].message).not.toBe(issues[1].message);
  });

  it("裏拍ちょうどなら「N拍目裏」と示す", () => {
    const issues = run([chord(240, QUARTER)], [measure(4, 4)]);
    expect(issues[0].detail).toMatchObject({ position: "1拍目裏", crossedBeats: "2拍目の頭" });
  });

  it("複数の拍境界をまたぐ場合はすべて列挙する", () => {
    // 240..1200 は 480 と 960 をまたぐ
    expect(
      run([chord(240, { numerator: 1, denominator: 2 })], [measure(4, 4)])[0].detail,
    ).toMatchObject({ crossedBeats: "2・3拍目の頭" });
  });

  it("拍頭から始まり中央境界をまたがない音符は検出しない", () => {
    // 3拍目からの2分音符（960..1920）は 1440 をまたぐが中央境界 960 はまたがない
    const issues = run([chord(0, QUARTER), chord(480, QUARTER), chord(960, HALF)], [measure(4, 4)]);
    expect(issues).toHaveLength(0);
  });

  describe("主要境界（小節の中央）は小節頭始まりだけが例外", () => {
    it("2拍目からの付点4分は拍頭始まりでも warning で検出する", () => {
      // 480..1200 は中央境界 960 をまたぐ。4分音符 ⌣ 8分音符 に分割すべきケース
      const issues = run([chord(480, DOTTED_QUARTER)], [measure(4, 4)]);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].message).toBe(
        "Vn1: 1小節目 2拍目 から始まる付点4分音符が3拍目の頭をまたいでいます。" +
          "4分音符+8分音符のタイに分割することを推奨します",
      );
    });

    it("2拍目からの2分音符も検出する", () => {
      // 480..1440。中央境界 960 を隠すので 4分音符 ⌣ 4分音符
      const issues = run([chord(480, HALF)], [measure(4, 4)]);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].detail).toMatchObject({ position: "2拍目", suggestedSplit: [480, 480] });
    });

    it("小節頭からの2分音符・付点2分音符・全音符は検出しない", () => {
      const dottedHalf = { numerator: 3, denominator: 4 };
      expect(run([chord(0, HALF)], [measure(4, 4)])).toHaveLength(0);
      expect(run([chord(0, dottedHalf)], [measure(4, 4)])).toHaveLength(0);
      expect(run([chord(0, WHOLE)], [measure(4, 4)])).toHaveLength(0);
    });

    it("4/4 の「4分+付点4分+付点4分」は 2・3 音目を検出する", () => {
      const issues = run(
        [chord(0, QUARTER), chord(480, DOTTED_QUARTER), chord(1200, DOTTED_QUARTER)],
        [measure(4, 4)],
      );
      expect(issues.map((i) => [i.detail?.position, i.severity])).toEqual([
        ["2拍目", "warning"], // 中央境界をまたぐ
        ["3拍目裏", "info"], // 4拍目の頭のみをまたぐ
      ]);
    });

    it("奇数拍子には中央が無いので 3/4 の「4分+2分」は検出しない", () => {
      // 480..1440 は 3/4 の標準的な記譜。偶数拍子の強い規則を適用してはいけない
      expect(run([chord(0, QUARTER), chord(480, HALF)], [measure(3, 4)])).toHaveLength(0);
    });

    it("奇数拍子では中間の拍境界またぎも warning に上げない", () => {
      // 3/4 の 960（3拍目頭）は中央ではない。裏拍始まりで検出はするが severity は info
      const issues = run([chord(720, QUARTER)], [measure(3, 4)]);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("info");
      expect(issues[0].detail).toMatchObject({ crossesPrimaryBoundary: false });
    });

    it("9/8 も奇数拍数なので中央の規則を適用しない", () => {
      // 720..1440 は 2 拍目まるごと。拍頭始まりなので検出しない
      expect(run([chord(720, DOTTED_QUARTER)], [measure(9, 8)])).toHaveLength(0);
    });

    it("12/8 の 2 拍目からの付点2分は中央（3拍目頭）をまたぐので warning", () => {
      // beatUnit = 720、中央 = 1440。720..2160 が中央をまたぐ
      const issues = run([chord(720, { numerator: 3, denominator: 4 })], [measure(12, 8)]);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].detail).toMatchObject({ position: "2拍目", timeSig: "12/8" });
    });

    it("2/4 の 2 拍目は中央そのものなので、またぐ音符は warning", () => {
      const issues = run([chord(240, QUARTER)], [measure(2, 4)]);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].detail).toMatchObject({ timeSig: "2/4" });
    });
  });

  it("複付点音符も音価名と分割案を出せる", () => {
    // 複付点4分（840）を 2 拍目裏から。720..1560 が 960・1440 をまたぐ
    const issues = run([chord(720, { numerator: 7, denominator: 16 })], [measure(4, 4)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("複付点4分音符が");
    expect(issues[0].message).toContain("8分音符+4分音符+16分音符のタイ");
  });

  it("meta.measures に載っていない小節の音符は判定しない", () => {
    const issues = beatCrossingTieChecker.run(
      buildIR({
        parts: [{ partName: "Vn1" }],
        events: [
          { kind: K.CHORD, staff: 0, voice: 0, measure: 2, tick: 2280, duration: DOTTED_EIGHTH },
        ],
        // 1 小節目しか拍子が取れなかったケース
        measures: [measure(4, 4)],
      }),
    );
    expect(issues).toHaveLength(0);
  });

  it("複数パートでは staffIdx ごとに正しいパート名を付ける", () => {
    const issues = beatCrossingTieChecker.run(
      buildIR({
        parts: [{ partName: "Vn1" }, { partName: "Vc" }],
        events: [
          { kind: K.CHORD, staff: 0, voice: 0, measure: 1, tick: 360, duration: DOTTED_EIGHTH },
          { kind: K.CHORD, staff: 1, voice: 0, measure: 1, tick: 480, duration: DOTTED_QUARTER },
        ],
        measures: [measure(4, 4)],
      }),
    );
    expect(issues.map((i) => [i.staffIdx, i.partName, i.severity])).toEqual([
      [0, "Vn1", "info"],
      [1, "Vc", "warning"],
    ]);
    expect(issues[0].message.startsWith("Vn1: ")).toBe(true);
    expect(issues[1].message.startsWith("Vc: ")).toBe(true);
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

  describe("連符は判定対象外", () => {
    // 分母が 2 の冪でないものが連符。1920 = 2^7×3×5 なので 1920 % q === 0 では弾けない
    const TRIPLET_QUARTER = { numerator: 1, denominator: 6 }; // 320 tick
    const QUINTUPLET_16TH = { numerator: 1, denominator: 20 }; // 96 tick

    it("4分3連の 2 音目は拍境界をまたぐが検出しない", () => {
      // 320..640 は 2 拍目頭（480）をまたぐ。タイ分割の提案が意味をなさない
      expect(
        run([chord(0, TRIPLET_QUARTER), chord(320, TRIPLET_QUARTER)], [measure(4, 4)]),
      ).toHaveLength(0);
    });

    it("8分3連も検出しない", () => {
      // 400..560 は 480 をまたぐ
      expect(run([chord(400, TRIPLET_EIGHTH)], [measure(4, 4)])).toHaveLength(0);
    });

    it("5連符も検出しない", () => {
      // 432..528 は 480 をまたぐ
      expect(run([chord(432, QUINTUPLET_16TH)], [measure(4, 4)])).toHaveLength(0);
    });
  });

  it("連符フラグが立っていれば音価に関わらず判定対象外", () => {
    // 4:3 連符のように分母が 2 の冪になる連符は音価だけでは見分けられない
    expect(
      run([{ ...chord(360, { numerator: 3, denominator: 16 }), tuplet: true }], [measure(4, 4)]),
    ).toHaveLength(0);
  });

  it("小節線をまたぐ音符は最強の境界として warning で検出する", () => {
    // 1440..2160 は小節線(1920)を越える。データモデル上は起きないが規則としては網羅する
    const issues = run([chord(1440, DOTTED_QUARTER)], [measure(4, 4)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].message).toContain("小節線をまたいでいます");
    expect(issues[0].detail).toMatchObject({
      crossesBarline: true,
      durationTicks: 720,
      suggestedSplit: [480, 240],
    });
  });

  it("小節頭から始まっても小節線をまたげば検出する", () => {
    // breve（2/1 = 3840 tick）は 4/4 の小節に収まらない
    const issues = run([chord(0, { numerator: 2, denominator: 1 })], [measure(4, 4)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toMatchObject({ crossesBarline: true, durationTicks: 3840 });
  });

  it("素/付点/複付点でない比率は音価として扱わない", () => {
    // 5/4 は 2 の冪倍の 1/3/7 にならない
    expect(run([chord(360, { numerator: 5, denominator: 4 })], [measure(4, 4)])).toHaveLength(0);
  });

  it("duration の無い chord は判定対象外", () => {
    expect(
      run([{ kind: K.CHORD, staff: 0, voice: 0, measure: 1, tick: 360 }], [measure(4, 4)]),
    ).toHaveLength(0);
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
