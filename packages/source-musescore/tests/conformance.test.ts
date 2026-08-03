import type { MuseScore, Score } from "@kjfsm/musescore-plugin-sdk-types";
import { profileIR } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { buildSnapshot } from "../src/snapshot.js";
import type { HostEnums } from "../src/types.js";

const NoteType = { NORMAL: 100, INVALID: 355 };
const BarLineType = { NORMAL: 200, END: 206 };

function hostEnums(): HostEnums {
  return {
    noteType: NoteType as unknown as HostEnums["noteType"],
    barLineType: BarLineType as unknown as HostEnums["barLineType"],
  };
}

/**
 * MusicXML 側の fixture（duet.musicxml）と同じ構成要素を持つモックスコア。
 * chord / rest / barline に加え、テンポ表記・強弱・staff text・全体注記を載せる。
 *
 * .mscz は Node では読めない（buildSnapshot は MuseScore の Score オブジェクトを要求する）
 * ので、MuseScore 経路の IR はこうした手書きモックからしか作れない。したがって
 * このプロファイルの忠実度はモックの忠実度が上限で、「モックが実機と一致していること」は
 * .github/workflows/score-lint.yml（実機の MuseScore で .mscz を変換して CLI に掛ける）が担う。
 */
function mockScore(): Score {
  const chord = {
    name: "Chord",
    noteType: NoteType.NORMAL,
    duration: { numerator: 1, denominator: 4 },
    notes: [],
    stemDirection: 0,
    beamMode: 0,
    spannerForward: [],
  };
  const rest = { name: "Rest", duration: { numerator: 1, denominator: 4 } };
  const barline = { name: "BarLine", barlineType: BarLineType.END };

  const seg = {
    tick: 0,
    annotations: [
      // staff 0 に紐づく注記（track 0 → staffIdx 0）
      { name: "Tempo", plainText: "Allegro", track: 0, tempo: 2, subtype: 0 },
      { name: "Dynamic", plainText: "p", track: 0, subtype: 3 },
      { name: "StaffText", plainText: "pizz.", track: 0, subtype: 0 },
      // track を持たず staffIdx も負＝全パート共通の注記（scope: "global"）
      { name: "SystemText", plainText: "Ⅰ", staffIdx: -1, subtype: 0 },
    ],
    nextInMeasure: null,
    elementAt(track: number) {
      if (track === 0) return chord;
      if (track === 1) return rest;
      if (track === 3) return barline;
      return null;
    },
  };
  const measure = {
    firstSegment: seg,
    nextMeasure: null,
    irregular: false,
    tick: { ticks: 0 },
    ticks: { ticks: 1920 },
    // SDK の getMeasureTimeSig は Fraction.str（"4/4"）を読む
    timesigNominal: { str: "4/4" },
  };
  return {
    nstaves: 1,
    ntracks: 4,
    parts: [],
    firstMeasure: measure,
    staves: [],
  } as unknown as Score;
}

/**
 * MuseScore 経路が作る LintIR の契約プロファイル。MusicXML 経路側の同名テスト
 * （packages/source-musicxml/tests/conformance.test.ts）と並べて読むと、両ソースの差が
 * そのまま見える。片方だけが満たしている項目は、そのまま「入力ソースによって
 * 動いたり動かなかったりする checker」になる。
 */
describe("MuseScore 経路の LintIR 契約プロファイル", () => {
  const profile = profileIR(
    buildSnapshot(mockScore(), hostEnums(), undefined as unknown as MuseScore),
  );

  it("索引は events と整合している", () => {
    expect(profile.indexConsistent).toBe(true);
  });

  it("type は kind から導出した値と一致する", () => {
    expect(profile.typeMatchesKind).toBe(true);
  });

  it("meta.measures を持つ", () => {
    expect(profile.hasMeasures).toBe(true);
  });

  it("小節番号を解決できないイベントは無い", () => {
    expect(profile.eventsWithoutMeasure).toBe(0);
  });

  // core のビルダが chord/rest の最初の tick から導出する。以前は snapshot.ts が
  // 自前で代入しており、ビルダに載せ替えたときに落ちやすい箇所。
  it("firstMusicTickByStaff が最初の音符/休符の tick になる", () => {
    const ir = buildSnapshot(mockScore(), hostEnums(), undefined as unknown as MuseScore);
    expect(ir.meta.firstMusicTickByStaff).toEqual([0]);
  });

  // ─── ここから下が MusicXML 経路との差分（MusicXML 側は満たしていない） ───

  it("global scope の注記を作る", () => {
    expect(profile.hasGlobalScope).toBe(true);
  });

  it("テキスト系イベントの subtype を埋める", () => {
    expect(profile.subtypeFilledRatio).toBe(1);
  });

  it("EXPRESSION / SYSTEM_TEXT を kind として区別する", () => {
    expect(profile.kinds).toContain("system_text");
  });
});
