import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import {
  crescTextResolution,
  dynamicAfterRest,
  dynamicAsText,
  duplicateDynamics,
  firstNoteDynamics,
  hairpinOnRest,
  hairpinTargetDynamic,
  overlappingHairpins,
  simultaneousDynamics,
  tieContinuationDynamic,
} from "../src/rules/dynamics.js";
import { cleanScore, runRule } from "./helpers.js";

const dynamic = (text: string, tick: number, measure: number, staff = 0) => ({
  staff,
  tick,
  measure,
  text,
  kind: "dynamic" as const,
});

describe("first-note-dynamics", () => {
  it("1音目にダイナミクスが無いパートだけを error で報告する", () => {
    const score = buildScore({
      parts: [
        { id: "P1", name: "Vn1" },
        { id: "P2", name: "Vn2" },
      ],
      chords: [
        { staff: 0, tick: 0 },
        { staff: 1, tick: 0 },
      ],
      annotations: [dynamic("f", 0, 1)],
    });
    const issues = runRule(firstNoteDynamics, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ruleId: "first-note-dynamics",
      severity: "error",
      at: { partId: "P2", staff: 1, measure: 1, tick: 0 },
    });
  });

  it("楽譜全体に付いた強弱記号は全パートの1音目に効く", () => {
    const score = buildScore({
      parts: [{ id: "P1" }, { id: "P2" }],
      chords: [
        { staff: 0, tick: 0 },
        { staff: 1, tick: 0 },
      ],
      annotations: [{ tick: 0, text: "f", kind: "dynamic" }],
    });
    expect(runRule(firstNoteDynamics, score)).toEqual([]);
  });
});

describe("duplicate-dynamics", () => {
  it("同パートで f → f が連続したら info で報告し、前回の小節を detail に持つ", () => {
    const score = cleanScore({ annotations: [dynamic("f", 480, 2)] });
    const issues = runRule(duplicateDynamics, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { partId: "P1", staff: 0, measure: 2, tick: 480 },
      detail: { previousMeasure: 1 },
    });
  });

  it("f → più f は変化なので重複としない", () => {
    const score = buildScore({
      chords: [{ tick: 0 }],
      annotations: [dynamic("f", 0, 1), dynamic("più f", 480, 2)],
    });
    expect(runRule(duplicateDynamics, score)).toEqual([]);
  });

  it("記号を持たない強弱テキストは、テキストが違えば重複としない", () => {
    const score = buildScore({
      annotations: [dynamic("poco a poco", 0, 1), dynamic("molto", 480, 2)],
    });
    expect(runRule(duplicateDynamics, score)).toEqual([]);
  });

  it("f → p のように変化していれば報告しない", () => {
    const score = cleanScore({ annotations: [dynamic("p", 480, 2)] });
    expect(runRule(duplicateDynamics, score)).toEqual([]);
  });

  it("別パートの強弱記号とは比べない", () => {
    expect(runRule(duplicateDynamics, cleanScore())).toEqual([]);
  });

  it("2つの強弱記号の間でヘアピンが始まっていれば報告しない", () => {
    const score = buildScore({
      annotations: [dynamic("f", 0, 1), dynamic("f", 960, 3)],
      hairpins: [{ startTick: 240, endTick: 720 }],
    });
    expect(runRule(duplicateDynamics, score)).toEqual([]);
  });

  it("別パートのヘアピンは数えず、重複として報告する", () => {
    const score = buildScore({
      parts: [{ id: "P1" }, { id: "P2" }],
      annotations: [dynamic("f", 0, 1), dynamic("f", 960, 3)],
      hairpins: [{ staff: 1, startTick: 240, endTick: 720 }],
    });
    expect(runRule(duplicateDynamics, score)).toHaveLength(1);
  });

  it("2つ目の強弱記号以降に始まるヘアピンでは免除しない", () => {
    const score = buildScore({
      annotations: [dynamic("f", 0, 1), dynamic("f", 480, 2)],
      hairpins: [{ startTick: 480, endTick: 960 }],
    });
    expect(runRule(duplicateDynamics, score)).toHaveLength(1);
  });

  it.each(["sf", "rf"])("%s → %s の連続はアクセントとして許す", (mark) => {
    const score = buildScore({
      annotations: [dynamic(mark, 0, 1), dynamic(mark, 480, 2)],
    });
    expect(runRule(duplicateDynamics, score)).toEqual([]);
  });
});

describe("simultaneous-dynamics", () => {
  it("同じ位置に p と f があれば衝突として warning で報告する", () => {
    const score = cleanScore({ annotations: [dynamic("p", 0, 1)] });
    const issues = runRule(simultaneousDynamics, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "warning",
      at: { partId: "P1", staff: 0, measure: 1, tick: 0 },
      detail: { dynamics: ["f", "p"] },
    });
  });

  it("同じ f が重なるだけなら衝突としない", () => {
    const score = cleanScore({ annotations: [dynamic("f", 0, 1)] });
    expect(runRule(simultaneousDynamics, score)).toEqual([]);
  });

  it("f と f espr. は修飾語だけの違いなので衝突しない", () => {
    const score = cleanScore({ annotations: [dynamic("f espr.", 0, 1)] });
    expect(runRule(simultaneousDynamics, score)).toEqual([]);
  });

  it("別の譜表の強弱記号とは衝突しない", () => {
    const score = buildScore({
      parts: [{ id: "P1" }, { id: "P2" }],
      annotations: [dynamic("f", 0, 1, 0), dynamic("p", 0, 1, 1)],
    });
    expect(runRule(simultaneousDynamics, score)).toEqual([]);
  });
});

describe("hairpin-target-dynamic", () => {
  const chordsAt = (...ticks: number[]) => ticks.map((tick) => ({ tick }));

  it("曲中のヘアピン終端にダイナミクスが無ければ info で報告する", () => {
    // 終端 480 より後に音(960)があるので、曲尾のヘアピンではない
    const score = buildScore({
      chords: chordsAt(0, 480, 960),
      hairpins: [{ startTick: 0, endTick: 480 }],
    });
    const issues = runRule(hairpinTargetDynamic, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { partId: "P1", staff: 0, tick: 480 },
      detail: { startTick: 0, endTick: 480 },
    });
  });

  it("曲尾まで伸びるヘアピン（dim. al niente など）は報告しない", () => {
    const score = buildScore({
      chords: chordsAt(0, 480),
      hairpins: [{ startTick: 0, endTick: 480 }],
    });
    expect(runRule(hairpinTargetDynamic, score)).toEqual([]);
  });

  it("ヘアピン終端にダイナミクスがあれば報告しない", () => {
    const score = buildScore({
      chords: chordsAt(0, 480, 960),
      annotations: [dynamic("ff", 480, 2)],
      hairpins: [{ startTick: 0, endTick: 480 }],
    });
    expect(runRule(hairpinTargetDynamic, score)).toEqual([]);
  });
});

describe("hairpin-on-rest", () => {
  it("終了端点が休符上なら info で報告する", () => {
    const score = buildScore({
      chords: [{ tick: 0 }],
      rests: [{ tick: 480 }],
      hairpins: [{ startTick: 0, endTick: 480 }],
    });
    const issues = runRule(hairpinOnRest, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { partId: "P1", staff: 0, tick: 480 },
      detail: { kind: "hairpin", startTick: 0, endTick: 480 },
    });
    expect(issues[0]?.message).toContain("終了");
  });

  it("開始端点が休符上なら info で報告する", () => {
    const score = buildScore({
      rests: [{ tick: 0 }],
      chords: [{ tick: 480 }],
      hairpins: [{ startTick: 0, endTick: 480 }],
    });
    const issues = runRule(hairpinOnRest, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { tick: 0 } });
    expect(issues[0]?.message).toContain("開始");
  });

  it("両端点が音符上なら報告しない", () => {
    const score = buildScore({
      chords: [{ tick: 0 }, { tick: 480 }],
      hairpins: [{ startTick: 0, endTick: 480 }],
    });
    expect(runRule(hairpinOnRest, score)).toEqual([]);
  });

  it("同じ tick に別の声部の音符と休符があれば音符を優先して報告しない", () => {
    const score = buildScore({
      chords: [
        { voice: 0, tick: 0 },
        { voice: 0, tick: 480 },
      ],
      rests: [{ voice: 1, tick: 480 }],
      hairpins: [{ startTick: 0, endTick: 480 }],
    });
    expect(runRule(hairpinOnRest, score)).toEqual([]);
  });
});

describe("cresc-text-resolution", () => {
  it("cresc. の後に強弱記号が無ければ info で報告する", () => {
    const score = buildScore({
      chords: [{ tick: 0 }],
      annotations: [dynamic("cresc.", 0, 1)],
    });
    const issues = runRule(crescTextResolution, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { partId: "P1", staff: 0, measure: 1, tick: 0 },
    });
    expect(issues[0]?.message).toContain("cresc.");
  });

  it("cresc. の後に同じ譜表の強弱記号があれば報告しない", () => {
    const score = buildScore({
      annotations: [dynamic("cresc.", 0, 1), dynamic("f", 480, 1)],
    });
    expect(runRule(crescTextResolution, score)).toEqual([]);
  });

  it("cresc. の後に楽譜全体の強弱記号があれば報告しない", () => {
    const score = buildScore({
      annotations: [dynamic("cresc.", 0, 1), { tick: 480, text: "f", kind: "dynamic" }],
    });
    expect(runRule(crescTextResolution, score)).toEqual([]);
  });
});

describe("tie-continuation-dynamic", () => {
  const note = (pitch: number) => ({ pitch, tpc: 14, line: 0, accidentalShown: false });

  it("タイで続くだけの音に付いた強弱記号を info で指摘する", () => {
    const score = cleanScore({
      chords: [{ staff: 0, tick: 480, notes: [note(60)] }],
      ties: [{ staff: 0, startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
      annotations: [dynamic("p", 480, 1)],
    });
    const issues = runRule(tieContinuationDynamic, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", at: { staff: 0, tick: 480 } });
  });

  it("和音の一部が新しく弾かれるなら指摘しない", () => {
    const score = cleanScore({
      chords: [{ staff: 0, tick: 480, notes: [note(60), note(64)] }],
      ties: [{ staff: 0, startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
      annotations: [dynamic("p", 480, 1)],
    });
    expect(runRule(tieContinuationDynamic, score)).toEqual([]);
  });

  it("別の声部が同じ位置で新しく弾くなら指摘しない", () => {
    const score = cleanScore({
      chords: [
        { staff: 0, tick: 480, notes: [note(60)] },
        { staff: 0, voice: 1, tick: 480, notes: [note(48)] },
      ],
      ties: [{ staff: 0, startTick: 0, endTick: 480, startPitch: 60, endPitch: 60 }],
      annotations: [dynamic("p", 480, 1)],
    });
    expect(runRule(tieContinuationDynamic, score)).toEqual([]);
  });

  it("タイの無い音の強弱記号は指摘しない", () => {
    const score = cleanScore({
      chords: [{ staff: 0, tick: 480, notes: [note(60)] }],
      annotations: [dynamic("p", 480, 1)],
    });
    expect(runRule(tieContinuationDynamic, score)).toEqual([]);
  });
});

describe("overlapping-hairpins", () => {
  const withHairpins = (...spans: [number, number][]) =>
    cleanScore({
      chords: [
        { staff: 0, tick: 480 },
        { staff: 0, tick: 960 },
        { staff: 0, tick: 1440 },
      ],
      hairpins: spans.map(([startTick, endTick]) => ({ staff: 0, startTick, endTick })),
    });

  it("前のヘアピンが終わる前に始まるヘアピンを warning で指摘する", () => {
    const issues = runRule(overlappingHairpins, withHairpins([0, 960], [480, 1440]));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", at: { staff: 0, tick: 480 } });
  });

  it("端と端が接するだけなら指摘しない", () => {
    expect(runRule(overlappingHairpins, withHairpins([0, 960], [960, 1440]))).toEqual([]);
  });

  it("別の譜表のヘアピンとは比べない", () => {
    const score = cleanScore({
      hairpins: [
        { staff: 0, startTick: 0, endTick: 960 },
        { staff: 1, startTick: 480, endTick: 1440 },
      ],
    });
    expect(runRule(overlappingHairpins, score)).toEqual([]);
  });
});

describe("dynamic-after-rest", () => {
  const measures = Array.from({ length: 12 }, () => ({}));
  const tickOf = (measure: number) => (measure - 1) * 1920;
  const reentry = (measure: number, annotations: ReturnType<typeof dynamic>[] = []) =>
    cleanScore({
      measures,
      chords: [{ staff: 0, tick: tickOf(measure) }],
      annotations,
    });

  it("既定では 4 小節以上休んだあとの入りに強弱記号が無ければ info で指摘する", () => {
    const issues = runRule(dynamicAfterRest, reentry(6));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "info",
      at: { staff: 0, measure: 6, tick: tickOf(6) },
      detail: { restMeasures: 4, previousMeasure: 1 },
    });
  });

  it("休みが閾値より短ければ指摘しない", () => {
    expect(runRule(dynamicAfterRest, reentry(5))).toEqual([]);
  });

  it("入りの音か、その前の休みに強弱記号があれば指摘しない", () => {
    expect(runRule(dynamicAfterRest, reentry(6, [dynamic("p", tickOf(6), 6)]))).toEqual([]);
    expect(runRule(dynamicAfterRest, reentry(6, [dynamic("p", tickOf(5), 5)]))).toEqual([]);
  });

  it("前の音より前にある強弱記号は言い直しとみなさない", () => {
    const score = cleanScore({
      measures,
      chords: [
        { staff: 0, tick: tickOf(2) },
        { staff: 0, tick: tickOf(7) },
      ],
      annotations: [dynamic("p", tickOf(2), 2)],
    });
    expect(runRule(dynamicAfterRest, score)).toHaveLength(1);
  });

  it("休みの長さをオプションで変えられる", () => {
    expect(runRule(dynamicAfterRest, reentry(4), { restMeasures: "2" })).toHaveLength(1);
    expect(runRule(dynamicAfterRest, reentry(6), { restMeasures: "8" })).toEqual([]);
  });
});

describe("dynamic-as-text", () => {
  it("普通のテキストで書いた強弱記号を warning で指摘する", () => {
    const score = cleanScore({ annotations: [{ staff: 1, tick: 480, text: "mf" }] });
    const issues = runRule(dynamicAsText, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", at: { staff: 1, tick: 480 } });
  });

  it("強弱記号として入れたものと、修飾語の付いたテキストは指摘しない", () => {
    const score = cleanScore({ annotations: [{ staff: 1, tick: 480, text: "più f" }] });
    expect(runRule(dynamicAsText, score)).toEqual([]);
  });

  it("楽譜全体に付いたテキストは譜表を持たない指摘にする", () => {
    const score = cleanScore({ annotations: [{ tick: 480, text: "p" }] });
    expect(runRule(dynamicAsText, score)[0]).toMatchObject({ at: { staff: null, partId: null } });
  });

  it("パートに付いたテキストはパートの最初の譜表で指摘する", () => {
    const score = cleanScore({ annotations: [{ partId: "P2", tick: 480, text: "p" }] });
    expect(runRule(dynamicAsText, score)[0]).toMatchObject({ at: { staff: 1 } });
  });
});
