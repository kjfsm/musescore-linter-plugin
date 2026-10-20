import { describe, expect, it } from "vitest";

import {
  annotationsAffecting,
  annotationsOn,
  chordsIn,
  firstChord,
  lastTick,
  measureAt,
  partOfStaff,
  rhythmSignature,
  slursOn,
  spanCovers,
  voiceEventsIn,
} from "../src/queries.js";
import { buildScore } from "../src/spec.js";

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

  it("Score は JSON を往復しても同じ問い合わせ結果を返す", () => {
    const score = buildScore({ measures: [{}], chords: [{ tick: 0, duration: q }] });
    const copy = JSON.parse(JSON.stringify(score));
    expect(copy).toEqual(score);
    expect(rhythmSignature(copy, 0, 0, 1)).toBe(rhythmSignature(score, 0, 0, 1));
  });
});
