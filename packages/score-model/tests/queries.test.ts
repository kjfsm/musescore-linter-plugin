import { describe, expect, it } from "vitest";

import {
  annotationsAffecting,
  annotationsOn,
  chordsIn,
  firstChord,
  keyAt,
  lastTick,
  measureAt,
  partOfStaff,
  rhythmSignature,
  slursOn,
  spanCovers,
  tiesOn,
  voiceEventsIn,
} from "../src/queries.ts";
import { buildScore } from "../src/spec.ts";

const q = { numerator: 1, denominator: 4 };

describe("問い合わせ", () => {
  it("tick から小節を引く", () => {
    const score = buildScore({ measures: [{}, { timeSignature: [3, 4] }, {}] });
    expect(measureAt(score, 0)?.serial).toBe(1);
    expect(measureAt(score, 1919)?.serial).toBe(1);
    expect(measureAt(score, 1920)?.serial).toBe(2);
    expect(measureAt(score, 1920 + 1440)?.serial).toBe(3);
    expect(measureAt(score, -1)).toBeNull();
  });

  it("同名のパートでも譜表は識別子でパートに束ねる", () => {
    const score = buildScore({
      parts: [
        { id: "a", name: "Horn", staffCount: 2 },
        { id: "b", name: "Horn" },
      ],
    });
    expect(partOfStaff(score, 1)?.id).toBe("a");
    expect(partOfStaff(score, 2)?.id).toBe("b");
    expect(partOfStaff(score, 3)).toBeNull();
  });

  it("注記を効く範囲ごとに譜表へ配る", () => {
    const score = buildScore({
      parts: [{ id: "a", staffCount: 2 }, { id: "b" }],
      annotations: [
        { staff: 0, text: "pizz." },
        { partId: "a", text: "arco" },
        { text: "Allegro" },
      ],
    });
    const texts = (list: readonly { text: string }[]) => list.map((a) => a.text);
    expect(texts(annotationsOn(score, 0))).toEqual(["pizz.", "arco"]);
    expect(texts(annotationsOn(score, 1))).toEqual(["arco"]);
    expect(texts(annotationsOn(score, 2))).toEqual([]);
    expect(texts(annotationsAffecting(score, 2))).toEqual(["Allegro"]);
  });

  it("小節ごとの和音とリズムを声部別に引く", () => {
    const score = buildScore({
      measures: [{}, {}],
      chords: [
        { tick: 480, duration: q },
        { tick: 0, duration: q },
        { tick: 1920, duration: q },
        { tick: 0, voice: 1, duration: q },
      ],
      rests: [{ tick: 960, duration: q }],
    });
    expect(chordsIn(score, 0, 0, 1).map((c) => c.tick)).toEqual([0, 480]);
    expect(voiceEventsIn(score, 0, 0, 1).map((e) => e.type)).toEqual(["chord", "chord", "rest"]);
    expect(rhythmSignature(score, 0, 0, 1)).toBe("0/1/4/chord,480/1/4/chord,960/1/4/rest");
    expect(rhythmSignature(score, 0, 2, 1)).toBeUndefined();
    expect(firstChord(score, 0)?.tick).toBe(0);
  });

  it("スパナーが声部の tick を覆うかを見る", () => {
    const score = buildScore({
      slurs: [
        { startTick: 960, endTick: 1440 },
        { startTick: 0, endTick: 480, voice: 1 },
      ],
    });
    const slurs = slursOn(score, 0);
    expect(slurs.map((s) => s.startTick)).toEqual([0, 960]);
    expect(spanCovers(slurs, 0, 960)).toBe(true);
    expect(spanCovers(slurs, 0, 1440)).toBe(false);
    expect(spanCovers(slurs, 0, 0)).toBe(false);
    expect(spanCovers(slurs, 1, 0)).toBe(true);
  });

  it("最後の要素の tick は小節線と注記も見る", () => {
    const score = buildScore({
      chords: [{ tick: 480 }],
      barlines: [{ tick: 1920, kind: "final" }],
      annotations: [{ tick: 960, text: "fine" }],
    });
    expect(lastTick(score)).toBe(1920);
  });

  it("tick の位置に効いている調号を引く", () => {
    const score = buildScore({
      keySignatures: [
        { tick: 0, fifths: 2 },
        { tick: 1920, fifths: -3 },
      ],
    });
    expect(keyAt(score, 0, 0)).toBe(2);
    expect(keyAt(score, 0, 1919)).toBe(2);
    expect(keyAt(score, 0, 1920)).toBe(-3);
    expect(keyAt(buildScore({}), 0, 0)).toBeNull();
  });

  it("Score は JSON を往復しても同じ問い合わせ結果を返す", () => {
    const score = buildScore({ measures: [{}], chords: [{ tick: 0, duration: q }] });
    const copy = JSON.parse(JSON.stringify(score));
    expect(copy).toEqual(score);
    expect(rhythmSignature(copy, 0, 0, 1)).toBe(rhythmSignature(score, 0, 0, 1));
  });
});

describe("measureAt（音符の無い tick）", () => {
  const WHOLE = 1920;
  const threeMeasures = () => buildScore({ measures: [{}, {}, {}], chords: [{ tick: 0 }] });

  it("小節の先頭 tick でその小節を返す", () => {
    const score = threeMeasures();
    expect(measureAt(score, 0)?.serial).toBe(1);
    expect(measureAt(score, WHOLE)?.serial).toBe(2);
    expect(measureAt(score, WHOLE * 2)?.serial).toBe(3);
  });

  // ヘアピンの終端のように、音符が 1 つも無い tick を指す呼び出しがある
  it("和音の無い tick でも含まれる小節を返す", () => {
    const score = threeMeasures();
    expect(measureAt(score, WHOLE + 1)?.serial).toBe(2);
    expect(measureAt(score, WHOLE * 2 - 1)?.serial).toBe(2);
    expect(measureAt(score, WHOLE * 3 - 1)?.serial).toBe(3);
  });

  it("小節が無い楽譜では null", () => {
    expect(measureAt(buildScore({ chords: [{ tick: 480 }] }), 480)).toBeNull();
  });
});

describe("spanCovers（全件走査との一致）", () => {
  // 入れ子・重なり・隣接・別声部・長さ 0 を混ぜる。二分探索が startTick 昇順に頼るので、
  // 宣言順は昇順にしない。
  const spec = [
    { voice: 0, startTick: 480, endTick: 960 },
    { voice: 0, startTick: 0, endTick: 1920 },
    { voice: 1, startTick: 240, endTick: 720 },
    { voice: 0, startTick: 1920, endTick: 1920 },
    { voice: 0, startTick: 2400, endTick: 2880 },
  ];
  const score = buildScore({
    slurs: spec,
    ties: spec.map((s) => ({ ...s, startPitch: null, endPitch: null })),
  });

  const linearCovers = (voice: number, tick: number): boolean =>
    spec.some((s) => s.voice === voice && s.startTick <= tick && tick < s.endTick);

  it("全 tick・全声部で全件走査と同じ答えを返す", () => {
    for (let voice = 0; voice <= 2; voice++) {
      for (let tick = -100; tick <= 3200; tick += 20) {
        const expected = linearCovers(voice, tick);
        expect(spanCovers(slursOn(score, 0), voice, tick), `slur voice=${voice} tick=${tick}`).toBe(
          expected,
        );
        expect(spanCovers(tiesOn(score, 0), voice, tick), `tie voice=${voice} tick=${tick}`).toBe(
          expected,
        );
      }
    }
  });

  it("スパナーを持たない譜表では false", () => {
    expect(spanCovers(slursOn(score, 9), 0, 480)).toBe(false);
    expect(spanCovers(tiesOn(score, 9), 0, 480)).toBe(false);
  });
});

describe("rhythmSignature（譜表間の比較）", () => {
  it("同じリズムの譜表は同じ値で、音価が違う譜表は異なる値", () => {
    const rhythm = (staff: number) => [
      { staff, tick: 0, duration: q },
      { staff, tick: 960, duration: q },
    ];
    const score = buildScore({
      parts: [{ staffCount: 3 }],
      measures: [{}],
      chords: [
        ...rhythm(0),
        ...rhythm(1),
        { staff: 2, tick: 0, duration: { numerator: 1, denominator: 2 } },
      ],
      rests: [
        { staff: 0, tick: 480, duration: q },
        { staff: 1, tick: 480, duration: q },
      ],
    });
    const sig = (staff: number) => rhythmSignature(score, staff, 0, 1);
    expect(sig(0)).toBe(sig(1));
    expect(sig(2)).not.toBe(sig(0));
  });
});
