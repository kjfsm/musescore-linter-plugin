import type { MuseScore, Score } from "@kjfsm/musescore-plugin-sdk-types";
import { setPerfEnabled } from "@musescore-linter/core";
import { afterEach, describe, expect, it } from "vitest";

import { buildSnapshot, getSnapshotPerfReport } from "../src/snapshot.js";
import type { HostEnums } from "../src/types.js";

// 実際の MuseScore v4.7.3 の値と一致しない、独自の割り当てを使う。焼き込んだ値ではなく
// hostEnums 経由で解決されることを証明するため。
const NoteType = {
  NORMAL: 100,
  ACCIACCATURA: 101,
  APPOGGIATURA: 102,
  GRACE4: 104,
  GRACE16: 108,
  GRACE32: 116,
  GRACE8_AFTER: 132,
  GRACE16_AFTER: 164,
  GRACE32_AFTER: 228,
  INVALID: 355,
};

const BarLineType = {
  NORMAL: 200,
  BROKEN: 201,
  DOTTED: 202,
  END: 206,
  DOUBLE: 204,
  START_REPEAT: 207,
  END_REPEAT: 208,
  END_START_REPEAT: 209,
  HEAVY: 213,
  DOUBLE_HEAVY: 214,
  REVERSE_END: 210,
};

function hostEnums(): HostEnums {
  return {
    noteType: NoteType as unknown as HostEnums["noteType"],
    barLineType: BarLineType as unknown as HostEnums["barLineType"],
  };
}

function mockHost(major: number, minor: number): MuseScore {
  return {
    mscoreMajorVersion: major,
    mscoreMinorVersion: minor,
  } as unknown as MuseScore;
}

// 1 小節・1 コード（NORMAL）・末尾に BarLine(END) を持つ最小限のスコア。
// isGraceNote / classifyBarlineKind の両方の経路を実際に通す。
function mockScoreWithContent(): Score {
  const chord = {
    name: "Chord",
    noteType: NoteType.NORMAL,
    duration: { numerator: 1, denominator: 4 },
    notes: [],
    stemDirection: 0,
    beamMode: 0,
    spannerForward: [],
  };
  const barline = { name: "BarLine", barlineType: BarLineType.END };

  const seg = {
    tick: 0,
    annotations: [],
    nextInMeasure: null,
    elementAt(track: number) {
      if (track === 0) return chord;
      if (track === 3) return barline;
      return null;
    },
  };
  const measure = { firstSegment: seg, nextMeasure: null, irregular: false };
  return {
    nstaves: 1,
    ntracks: 4,
    parts: [],
    firstMeasure: measure,
    staves: [],
  } as unknown as Score;
}

/**
 * 全 4 voice に音符が乗り、末尾の voice に BarLine が来るスコア。elementAt の呼び出し回数を
 * 数えられるようにしてある。chord/rest と barline で track を引き直していないこと、および
 * イベントの生成順が voice 昇順 → barline のままであることを検証するために使う。
 */
function mockScoreCountingElementAt(): { score: Score; calls: () => number } {
  let calls = 0;
  const chordAt = (voice: number) => ({
    name: "Chord",
    noteType: NoteType.NORMAL,
    duration: { numerator: 1, denominator: 4 },
    notes: [],
    stemDirection: voice,
    beamMode: 0,
    spannerForward: [],
  });
  const rest = {
    name: "Rest",
    duration: { numerator: 1, denominator: 4 },
  };
  const barline = { name: "BarLine", barlineType: BarLineType.END };

  const seg = {
    tick: 0,
    annotations: [],
    nextInMeasure: null,
    elementAt(track: number) {
      calls++;
      if (track === 0) return chordAt(0);
      if (track === 1) return rest;
      if (track === 2) return chordAt(2);
      if (track === 3) return barline;
      return null;
    },
  };
  const measure = { firstSegment: seg, nextMeasure: null, irregular: false };
  return {
    score: {
      nstaves: 1,
      ntracks: 4,
      parts: [],
      firstMeasure: measure,
      staves: [],
    } as unknown as Score,
    calls: () => calls,
  };
}

function emptyScore(): Score {
  return {
    nstaves: 0,
    ntracks: 0,
    parts: [],
    firstMeasure: null,
    staves: [],
  } as unknown as Score;
}

describe("buildSnapshot", () => {
  it("host を渡さないときは meta.hostVersion を設定しない", () => {
    const ir = buildSnapshot(emptyScore(), hostEnums());
    expect(ir.meta.hostVersion).toBeUndefined();
  });

  it("実行版が型の生成元 MuseScore バージョンと一致するとき ok:true を記録する", () => {
    // generatedFrom.tag は v4.7.3（packages/types/src/generated/_meta.ts）
    const ir = buildSnapshot(emptyScore(), hostEnums(), mockHost(4, 7));
    expect(ir.meta.hostVersion).toEqual({
      ok: true,
      generatedTag: "v4.7.3",
      running: "4.7",
    });
  });

  it("実行版が食い違うとき ok:false + message を記録する", () => {
    const ir = buildSnapshot(emptyScore(), hostEnums(), mockHost(4, 6));
    expect(ir.meta.hostVersion?.ok).toBe(false);
    expect(ir.meta.hostVersion?.generatedTag).toBe("v4.7.3");
    expect(ir.meta.hostVersion?.running).toBe("4.6");
    expect(ir.meta.hostVersion?.message).toBeTruthy();
  });

  it("hostEnums が strictEnum で包まれても通常の判定が壊れない", () => {
    const ir = buildSnapshot(mockScoreWithContent(), hostEnums());
    const chordEvents = ir.events.filter((e) => e.type === "chord");
    const barlineEvents = ir.events.filter((e) => e.type === "barline");
    expect(chordEvents).toHaveLength(1);
    expect(barlineEvents).toHaveLength(1);
  });

  it("3 引数契約で events が正しく生成される（旧・3引数フラット契約とは異なる）", () => {
    const ir = buildSnapshot(mockScoreWithContent(), hostEnums(), mockHost(4, 7));
    expect(ir.events.length).toBeGreaterThan(0);
    const barline = ir.events.find((e) => e.type === "barline");
    expect(barline?.barlineKind).toBe("final");
  });

  it("elementAt は 1 track につき 1 回しか引かない", () => {
    const { score, calls } = mockScoreCountingElementAt();
    buildSnapshot(score, hostEnums());
    // 1 segment × 1 staff × 4 voice。chord/rest 用と barline 用で引き直さない。
    expect(calls()).toBe(4);
  });

  it("イベントは voice 昇順のあとに barline の順で生成される", () => {
    const { score } = mockScoreCountingElementAt();
    const ir = buildSnapshot(score, hostEnums());
    expect(ir.events.map((e) => [e.type, e.voice])).toEqual([
      ["chord", 0],
      ["rest", 1],
      ["chord", 2],
      ["barline", -1],
    ]);
    // id は生成順に振られる
    expect(ir.events.map((e) => e.id)).toEqual([0, 1, 2, 3]);
  });
});

describe("getSnapshotPerfReport", () => {
  afterEach(() => {
    setPerfEnabled(false);
  });

  it("計測が無効なら何も記録しない", () => {
    buildSnapshot(mockScoreWithContent(), hostEnums());
    expect(getSnapshotPerfReport()).toBe("");
  });

  it("計測が有効なら走査の内訳を記録する", () => {
    setPerfEnabled(true);
    buildSnapshot(mockScoreWithContent(), hostEnums());
    const report = getSnapshotPerfReport();
    expect(report).toContain("[ScoreLinter:snapshot]");
    expect(report).toMatch(/total\s+\d+ ms/);
    expect(report).toMatch(/measures\s+1 回/);
    expect(report).toMatch(/segments\s+1 回/);
    expect(report).toMatch(/staves\s+1 回/);
    // 1 segment × 1 staff × 4 voice
    expect(report).toMatch(/elementAt\(est\)\s+4 回/);
  });

  it("実行のたびに記録を捨てるので前回分が混ざらない", () => {
    setPerfEnabled(true);
    buildSnapshot(mockScoreWithContent(), hostEnums());
    buildSnapshot(mockScoreWithContent(), hostEnums());
    expect(getSnapshotPerfReport()).toMatch(/segments\s+1 回/);
  });
});
