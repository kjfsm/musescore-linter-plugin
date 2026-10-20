import type { BarlineKind } from "@score-linter/score-model";
import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import {
  codaSegno,
  courtesyAccidental,
  finalBarline,
  rehearsalMarkOrder,
  rehearsalMarkPosition,
  repeatBarlineMatch,
  restAnnotation,
} from "../src/rules/notation.js";
import { cleanScore, runRule } from "./helpers.js";

const barline = (tick: number, measure: number, kind: BarlineKind) => ({ tick, measure, kind });

describe("rest-annotation", () => {
  it("休符の位置の強弱記号は info で報告する", () => {
    const score = cleanScore(
      {
        rests: [{ tick: 480, measure: 2 }],
        annotations: [{ staff: 0, tick: 480, measure: 2, text: "p", kind: "dynamic" }],
      },
      ["Vn1"],
    );
    const issues = runRule(restAnnotation, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { partId: "P1", staff: 0, measure: 2, tick: 480 },
    });
  });

  it("休符の位置の pizz. は error で報告する", () => {
    const score = cleanScore(
      {
        rests: [{ tick: 480, measure: 2 }],
        annotations: [{ staff: 0, tick: 480, measure: 2, text: "pizz." }],
      },
      ["Vn1"],
    );
    const issues = runRule(restAnnotation, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "error",
      at: { partId: "P1", staff: 0, measure: 2, tick: 480 },
    });
  });

  it("パートに付いた奏法指示でも、そのパートの休符上なら報告する", () => {
    const score = cleanScore({
      rests: [{ staff: 0, tick: 960, measure: 3 }],
      annotations: [{ partId: "P1", tick: 960, measure: 3, text: "pizz." }],
    });
    expect(runRule(restAnnotation, score)).toHaveLength(1);
  });

  it("音符の位置の pizz. は報告しない", () => {
    const score = cleanScore({ annotations: [{ staff: 0, tick: 0, text: "pizz." }] }, ["Vn1"]);
    expect(runRule(restAnnotation, score)).toEqual([]);
  });

  it("音符の位置の強弱記号は報告しない", () => {
    expect(runRule(restAnnotation, cleanScore())).toEqual([]);
  });

  it("複数の譜表で違反があれば譜表ごとに報告する", () => {
    const score = buildScore({
      parts: [
        { id: "P1", name: "Vn1" },
        { id: "P2", name: "Vn2" },
      ],
      rests: [
        { staff: 0, tick: 0 },
        { staff: 1, tick: 0 },
      ],
      annotations: [
        { staff: 0, tick: 0, text: "f", kind: "dynamic" },
        { staff: 1, tick: 0, text: "p", kind: "dynamic" },
      ],
    });
    const issues = runRule(restAnnotation, score);
    expect(issues.map((i) => i.at.partId).sort()).toEqual(["P1", "P2"]);
  });
});

describe("final-barline", () => {
  it("最後の小節線が終止線でなければ info で報告する", () => {
    const score = cleanScore({ barlines: [barline(1920, 4, "other")] });
    const issues = runRule(finalBarline, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { partId: "P1", staff: 0, measure: 4, tick: 1920 },
    });
  });

  it("最後の小節線が終止線なら報告しない", () => {
    const score = cleanScore({ barlines: [barline(1920, 4, "final")] });
    expect(runRule(finalBarline, score)).toEqual([]);
  });

  it("途中の複縦線は無視し、最後の小節線だけを判定する", () => {
    const score = cleanScore({
      barlines: [barline(480, 2, "double"), barline(1920, 4, "final")],
    });
    expect(runRule(finalBarline, score)).toEqual([]);
  });

  it("小節線が1本も無ければ報告しない", () => {
    expect(runRule(finalBarline, cleanScore())).toEqual([]);
  });
});

describe("coda-segno", () => {
  const sys = (text: string, tick: number, measure: number) => ({ tick, measure, text });

  it("譜表に付いた D.S. も検出する", () => {
    const score = cleanScore({
      annotations: [{ staff: 0, tick: 960, measure: 3, text: "D.S." }],
    });
    expect(runRule(codaSegno, score)).toHaveLength(1);
  });

  it("D.S. があって Segno が無ければ、楽譜全体への error で報告する", () => {
    const score = cleanScore({ annotations: [sys("D.S.", 960, 3)] });
    const issues = runRule(codaSegno, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "error",
      at: { partId: null, staff: null, measure: 3, tick: 960 },
    });
  });

  it("D.S. al Coda があって Segno も Coda も無ければ 2 件報告する", () => {
    const score = cleanScore({ annotations: [sys("D.S. al Coda", 960, 3)] });
    expect(runRule(codaSegno, score)).toHaveLength(2);
  });

  it("Coda があって al Coda を参照する記号が無ければ報告する", () => {
    const score = cleanScore({ annotations: [sys("Coda", 960, 3)] });
    const issues = runRule(codaSegno, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("al Coda");
  });

  it("D.S. al Coda と Segno と Coda が揃っていれば報告しない", () => {
    const score = cleanScore({
      annotations: [sys("Segno", 0, 1), sys("D.S. al Coda", 960, 3), sys("Coda", 1440, 4)],
    });
    expect(runRule(codaSegno, score)).toEqual([]);
  });

  it("反復記号が何も無ければ報告しない", () => {
    expect(runRule(codaSegno, cleanScore())).toEqual([]);
  });

  it("D.C. al Fine があって Fine が無ければ報告する", () => {
    const score = cleanScore({ annotations: [sys("D.C. al Fine", 960, 3)] });
    const issues = runRule(codaSegno, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("Fine");
  });

  it("D.S. al Fine があって Fine が無ければ、Segno があっても報告する", () => {
    const score = cleanScore({
      annotations: [sys("Segno", 0, 1), sys("D.S. al Fine", 960, 3)],
    });
    const issues = runRule(codaSegno, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("Fine");
  });

  it("D.C. al Fine と Fine が揃っていれば報告しない", () => {
    const score = cleanScore({
      annotations: [sys("Fine", 480, 2), sys("D.C. al Fine", 960, 3)],
    });
    expect(runRule(codaSegno, score)).toEqual([]);
  });
});

describe("rehearsal-mark-order", () => {
  const marks = (...labels: string[]) =>
    cleanScore({
      annotations: labels.map((text, i) => ({
        tick: i * 480,
        measure: i + 1,
        text,
        kind: "rehearsal" as const,
      })),
    });

  it("A → B → C の昇順は報告しない", () => {
    expect(runRule(rehearsalMarkOrder, marks("A", "B", "C"))).toEqual([]);
  });

  it("B → A の逆転は info で報告し、前後のマークを detail に持つ", () => {
    const issues = runRule(rehearsalMarkOrder, marks("B", "A"));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { partId: null, staff: null, measure: 2, tick: 480 },
      detail: { previous: "B", current: "A" },
    });
  });

  it("A → A は重複として 1 件だけ報告し、順序の逆転は重ねない", () => {
    const issues = runRule(rehearsalMarkOrder, marks("A", "A"));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("重複");
  });
});

describe("repeat-barline-match", () => {
  it("開始リピートに終了が無ければ warning で報告する", () => {
    const score = buildScore({
      chords: [{ tick: 0 }],
      barlines: [barline(0, 1, "repeat-start")],
    });
    const issues = runRule(repeatBarlineMatch, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", at: { staff: 0, measure: 1 } });
  });

  it("開始と終了が対応していれば報告しない", () => {
    const score = buildScore({
      barlines: [barline(0, 1, "repeat-start"), barline(1920, 2, "repeat-end")],
    });
    expect(runRule(repeatBarlineMatch, score)).toEqual([]);
  });

  it("終了リピートだけなら曲頭からの反復として許す", () => {
    const score = buildScore({ barlines: [barline(1920, 2, "repeat-end")] });
    expect(runRule(repeatBarlineMatch, score)).toEqual([]);
  });

  it("開始のあとの開始終了（repeat-both）は新たな未対応の開始になる", () => {
    const score = buildScore({
      barlines: [barline(0, 1, "repeat-start"), barline(1920, 2, "repeat-both")],
    });
    const issues = runRule(repeatBarlineMatch, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.at.measure).toBe(2);
  });
});

describe("courtesy-accidental", () => {
  const fSharp = { pitch: 66, tpc: 20, line: 5, accidentalShown: true };
  const fNatural = { pitch: 65, tpc: 13, line: 5, accidentalShown: false };

  it("前の小節の F# の次の小節に記号なしの F があれば info で提案する", () => {
    const score = buildScore({
      chords: [
        { tick: 0, measure: 1, notes: [fSharp] },
        { tick: 1920, measure: 2, notes: [fNatural] },
      ],
    });
    const issues = runRule(courtesyAccidental, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { partId: "P1", staff: 0, measure: 2, tick: 1920 },
      detail: { line: 5, previousMeasure: 1, previousAlter: 1, currentAlter: 0 },
    });
    expect(issues[0]?.message).toContain("F");
  });

  it("次の小節でも臨時記号が表示されていれば提案しない", () => {
    const score = buildScore({
      chords: [
        { tick: 0, measure: 1, notes: [fSharp] },
        { tick: 1920, measure: 2, notes: [fSharp] },
      ],
    });
    expect(runRule(courtesyAccidental, score)).toEqual([]);
  });

  it("臨時記号の付いた小節の直後でなければ提案しない", () => {
    const score = buildScore({
      chords: [
        { tick: 0, measure: 1, notes: [fSharp] },
        { tick: 3840, measure: 3, notes: [fNatural] },
      ],
    });
    expect(runRule(courtesyAccidental, score)).toEqual([]);
  });

  it("前に臨時記号が無ければ提案しない", () => {
    const score = buildScore({ chords: [{ tick: 1920, measure: 2, notes: [fNatural] }] });
    expect(runRule(courtesyAccidental, score)).toEqual([]);
  });
});

describe("rehearsal-mark-position", () => {
  const markAt = (tick: number) =>
    cleanScore({
      measures: [{}, {}],
      annotations: [{ tick, text: "A", kind: "rehearsal" }],
    });

  it("小節の頭に無いリハーサルマークを info で指摘する", () => {
    const issues = runRule(rehearsalMarkPosition, markAt(1920 + 480));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { measure: 2, tick: 2400 } });
  });

  it("小節の頭のリハーサルマークは指摘しない", () => {
    expect(runRule(rehearsalMarkPosition, markAt(1920))).toEqual([]);
  });

  it("同じ位置で複数の譜表に付いたマークは 1 件にまとめる", () => {
    const score = cleanScore({
      measures: [{}, {}],
      annotations: [
        { staff: 0, tick: 2400, text: "A", kind: "rehearsal" },
        { staff: 1, tick: 2400, text: "A", kind: "rehearsal" },
      ],
    });
    expect(runRule(rehearsalMarkPosition, score)).toHaveLength(1);
  });
});
