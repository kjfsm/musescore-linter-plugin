import type { MuseScore, Score as MsScore } from "@score-linter/musescore-api-types";
import { connect } from "@score-linter/musescore-plugin-helpers";
import type { Annotation, Chord, Directive, Score } from "@score-linter/score-model";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readMuseScore } from "../src/reader.js";

// 実際の MuseScore のどの版とも違う値。ホストの enum 経由で解決されることを確かめる。
// 実機の NoteType.NORMAL は 0 なので、0 はこのホストではグレースノートになる。
const NoteType = {
  NORMAL: 100,
  ACCIACCATURA: 1,
  APPOGGIATURA: 2,
  GRACE4: 4,
  GRACE16: 8,
  GRACE32: 16,
  GRACE8_AFTER: 32,
  GRACE16_AFTER: 64,
  GRACE32_AFTER: 128,
  INVALID: 255,
};
const BarLineType = {
  NORMAL: 200,
  BROKEN: 201,
  DOTTED: 202,
  DOUBLE: 204,
  END: 206,
  START_REPEAT: 207,
  END_REPEAT: 208,
  END_START_REPEAT: 209,
  REVERSE_END: 210,
  HEAVY: 213,
  DOUBLE_HEAVY: 214,
};
const BracketType = { NORMAL: 300, BRACE: 301, SQUARE: 302, LINE: 303, NO_BRACKET: 304 };
const PlayingTechniqueType = {
  Natural: 400,
  Pizzicato: 401,
  ColLegno: 402,
  Mute: 403,
  SulPonticello: 404,
  SulTasto: 405,
};

const host = {
  NoteType,
  BarLineType,
  BracketType,
  PlayingTechniqueType,
  mscoreMajorVersion: 4,
  mscoreMinorVersion: 7,
} as unknown as MuseScore;

type Fake = Record<string, unknown>;

const QUARTER = 480;
const duration = { numerator: 1, denominator: 4 };

const note = (pitch = 60): Fake => ({ pitch, tpc: 14, line: 10, accidental: null });
const chord = (extra: Fake = {}): Fake => ({
  name: "Chord",
  noteType: NoteType.NORMAL,
  duration,
  notes: [note()],
  articulations: [],
  ...extra,
});
const rest = (): Fake => ({ name: "Rest", duration });
const barline = (type: number): Fake => ({ name: "BarLine", barlineType: type });

type Tracks = Partial<Record<number, Fake>>;

function segment(tick: number, tracks: Tracks = {}, annotations: Fake[] = []) {
  const seg = {
    tick,
    annotations,
    nextInMeasure: null as unknown,
    elementAt: vi.fn((track: number) => tracks[track] ?? null),
  };
  return seg;
}

function measure(no: number, segments: ReturnType<typeof segment>[], extra: Fake = {}) {
  segments.forEach((seg, i) => {
    seg.nextInMeasure = segments[i + 1] ?? null;
  });
  return {
    no,
    tick: { ticks: no * 4 * QUARTER },
    ticks: { ticks: 4 * QUARTER },
    timesigNominal: { str: "4/4" },
    firstSegment: segments[0] ?? null,
    lastSegment: segments[segments.length - 1] ?? null,
    nextMeasure: null as unknown,
    ...extra,
  };
}

function scoreOf(measures: Fake[], extra: Fake = {}): MsScore {
  measures.forEach((m, i) => {
    m["nextMeasure"] = measures[i + 1] ?? null;
  });
  return {
    nstaves: 1,
    parts: [],
    staves: [],
    firstMeasure: measures[0] ?? null,
    ...extra,
  } as unknown as MsScore;
}

const read = (score: MsScore): Score => readMuseScore(connect(host), score).score;

const oneSegment = (tracks: Tracks, annotations: Fake[] = [], extra: Fake = {}): MsScore =>
  scoreOf([measure(0, [segment(0, tracks, annotations)])], extra);

const directivesOf = (annotations: Annotation[]): Directive[] =>
  annotations.flatMap((a) => a.directives);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readMuseScore: 音符と休符", () => {
  it("グレースノートは拍の位置を持たないので飛ばす", () => {
    const score = read(
      oneSegment({
        0: chord({ noteType: NoteType.ACCIACCATURA }),
        1: chord({ noteType: NoteType.GRACE16_AFTER }),
        2: chord(),
      }),
    );
    expect(score.staves[0]?.voices.map((v) => v.events.length)).toEqual([0, 0, 1]);
  });

  it("グレースノートかどうかをホストの NoteType から決める", () => {
    const score = read(oneSegment({ 0: chord({ noteType: 0 }), 1: chord() }));
    expect(score.staves[0]?.voices[1]?.events).toHaveLength(1);
    expect(score.staves[0]?.voices[0]?.events).toEqual([]);
  });

  it("声部ごとに分け、連符と音価のない休符も読む", () => {
    const score = read(
      oneSegment({
        0: chord(),
        1: { ...rest(), tuplet: {}, duration: null },
      }),
    );
    const voices = score.staves[0]?.voices;
    expect(voices?.[0]?.events[0]).toMatchObject({
      type: "chord",
      duration,
      tuplet: false,
      articulations: [],
    });
    expect(voices?.[1]?.events[0]).toMatchObject({ type: "rest", duration: null, tuplet: true });
  });

  it("音高の無い音符は pitch が null、表示された臨時記号を拾う", () => {
    const score = read(
      oneSegment({
        0: chord({
          notes: [
            { tpc: 14, line: 3, accidental: { name: "Accidental" } },
            { pitch: 61, tpc: 21, line: 10, accidental: null },
          ],
        }),
      }),
    );
    const first = score.staves[0]?.voices[0]?.events[0] as Chord;
    expect(first.notes).toEqual([
      { pitch: null, tpc: 14, line: 3, accidentalShown: true },
      { pitch: 61, tpc: 21, line: 10, accidentalShown: false },
    ]);
  });

  it("elementAt は 1 track につき 1 回しか引かない", () => {
    const seg = segment(0, { 0: chord(), 1: rest(), 2: chord(), 3: barline(BarLineType.END) });
    read(scoreOf([measure(0, [seg])]));
    expect(seg.elementAt).toHaveBeenCalledTimes(4);
  });

  it("譜表ごとに 4 track ずつ引く", () => {
    const seg = segment(0, { 4: chord() });
    const score = read(scoreOf([measure(0, [seg])], { nstaves: 2 }));
    expect(seg.elementAt.mock.calls.map(([track]) => track)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(score.staves[1]?.voices[0]?.events).toHaveLength(1);
  });
});

describe("readMuseScore: スパナ", () => {
  const tied = (start: unknown, end: unknown) =>
    chord({
      notes: [
        {
          ...note(),
          tieForward: {
            name: "Tie",
            startNote: start,
            endNote: end,
            spannerTick: { ticks: 0 },
            spannerTicks: { ticks: QUARTER },
          },
        },
      ],
    });

  it("タイの端の音符が無いときは両端の音高を null にする", () => {
    const score = read(oneSegment({ 0: tied({ pitch: 60 }, null) }));
    expect(score.ties).toEqual([
      { staff: 0, voice: 0, startTick: 0, endTick: QUARTER, startPitch: null, endPitch: null },
    ]);
  });

  it("スラーとヘアピンは音符の spannerForward から拾い、タイの声部を保つ", () => {
    const spanner = (name: string) => ({
      name,
      spannerTick: { ticks: 0 },
      spannerTicks: { ticks: 2 * QUARTER },
    });
    const score = read(
      oneSegment({
        2: chord({
          notes: [
            { ...note(), spannerForward: [spanner("Slur"), spanner("Hairpin"), spanner("Other")] },
          ],
        }),
      }),
    );
    expect(score.slurs).toEqual([{ staff: 0, voice: 2, startTick: 0, endTick: 2 * QUARTER }]);
    expect(score.hairpins).toEqual([{ staff: 0, startTick: 0, endTick: 2 * QUARTER }]);
  });
});

describe("readMuseScore: 小節", () => {
  it("表示上の小節番号は no + 1、serial は数えた通し番号", () => {
    const score = read(
      scoreOf([
        measure(0, [segment(0)]),
        measure(5, [segment(QUARTER * 4)]),
        measure(6, [segment(QUARTER * 8)]),
      ]),
    );
    expect(score.measures.map((m) => [m.serial, m.label])).toEqual([
      [1, "1"],
      [2, "6"],
      [3, "7"],
    ]);
  });

  it("小節番号が取れないときは通し番号を表示に使う", () => {
    const m = measure(0, [segment(0)], { no: undefined });
    expect(read(scoreOf([m])).measures[0]?.label).toBe("1");
  });

  it("開始 tick が取れない小節は前の小節の終わりから続ける", () => {
    const first = measure(0, [segment(0)]);
    const second = measure(1, [segment(QUARTER * 4)], { tick: undefined });
    expect(read(scoreOf([first, second])).measures.map((m) => m.startTick)).toEqual([
      0,
      4 * QUARTER,
    ]);
  });

  it("拍子は整数の分数だけ読み、読めなければ null", () => {
    const sigs = ["3/4", "", "4", "0/4", "4/0", "a/4", "2.5/4"];
    const score = read(
      scoreOf(sigs.map((str, i) => measure(i, [segment(i)], { timesigNominal: { str } }))),
    );
    expect(score.measures.map((m) => m.timeSignature)).toEqual([
      { numerator: 3, denominator: 4 },
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("origins.measures は小節の最初と最後のセグメントの tick", () => {
    const m1 = measure(0, [segment(0), segment(QUARTER), segment(4 * QUARTER)]);
    const m2 = measure(1, [segment(4 * QUARTER)]);
    const { origins } = readMuseScore(connect(host), scoreOf([m1, m2]));
    expect(origins.measures).toEqual([
      { firstSegmentTick: 0, lastSegmentTick: 4 * QUARTER },
      { firstSegmentTick: 4 * QUARTER, lastSegmentTick: 4 * QUARTER },
    ]);
  });

  it("セグメントの無い小節の origins は小節の開始 tick になる", () => {
    const empty = measure(1, []);
    const { origins } = readMuseScore(connect(host), scoreOf([measure(0, [segment(0)]), empty]));
    expect(origins.measures[1]).toEqual({
      firstSegmentTick: 4 * QUARTER,
      lastSegmentTick: 4 * QUARTER,
    });
  });

  it("1 小節の読み取りが失敗しても続け、以降の通し番号はずれない", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = segment(4 * QUARTER);
    broken.elementAt.mockImplementation(() => {
      throw new Error("壊れた小節");
    });
    const score = read(
      scoreOf([
        measure(0, [segment(0, { 0: chord() })]),
        measure(1, [broken]),
        measure(2, [segment(8 * QUARTER, { 0: chord() })]),
      ]),
    );
    expect(score.measures.map((m) => m.serial)).toEqual([1, 2, 3]);
    expect(score.staves[0]?.voices[0]?.events.map((e) => e.measure)).toEqual([1, 3]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("2 小節目");
  });
});

describe("readMuseScore: 小節線", () => {
  it("小節線の種類をホストの BarLineType から分類する", () => {
    const kinds = [
      BarLineType.NORMAL,
      BarLineType.DOUBLE,
      BarLineType.END,
      BarLineType.REVERSE_END,
      BarLineType.START_REPEAT,
      BarLineType.END_REPEAT,
      BarLineType.END_START_REPEAT,
      999,
    ];
    const score = read(
      scoreOf(kinds.map((type, i) => measure(i, [segment(i, { 0: barline(type) })]))),
    );
    expect(score.staves[0]?.barlines.map((b) => b.kind)).toEqual([
      "other",
      "double",
      "final",
      "final",
      "repeat-start",
      "repeat-end",
      "repeat-both",
      "other",
    ]);
  });

  it("小節線は譜表ごとに 1 本だけ読む", () => {
    const score = read(oneSegment({ 0: barline(BarLineType.END), 1: barline(BarLineType.DOUBLE) }));
    expect(score.staves[0]?.barlines).toEqual([{ tick: 0, measure: 1, kind: "final" }]);
  });
});

describe("readMuseScore: パート", () => {
  it("パート名が空なら、そのパートの先頭の譜表番号で Staff N とする", () => {
    const score = read(
      scoreOf([], {
        nstaves: 3,
        parts: [
          { startTrack: 0, endTrack: 4, longName: "Flute" },
          { startTrack: 4, endTrack: 12, longName: "" },
        ],
      }),
    );
    expect(score.parts).toEqual([
      { id: "part-0", name: "Flute", staves: [0] },
      { id: "part-1", name: "Staff 2", staves: [1, 2] },
    ]);
  });

  it("同名の別パートは別の id になる", () => {
    const score = read(
      scoreOf([], {
        nstaves: 2,
        parts: [
          { startTrack: 0, endTrack: 4, longName: "Horn in F" },
          { startTrack: 4, endTrack: 8, longName: "Horn in F" },
        ],
      }),
    );
    expect(score.parts.map((p) => [p.id, p.name])).toEqual([
      ["part-0", "Horn in F"],
      ["part-1", "Horn in F"],
    ]);
  });

  it("パートに覆われない譜表は 1 譜表ずつのパートにする", () => {
    const score = read(scoreOf([], { nstaves: 2, parts: undefined }));
    expect(score.parts).toEqual([
      { id: "staff-0", name: "Staff 1", staves: [0] },
      { id: "staff-1", name: "Staff 2", staves: [1] },
    ]);
  });

  it("楽譜が空でも落ちない", () => {
    const score = read(scoreOf([], { nstaves: 0 }));
    expect(score).toMatchObject({ parts: [], staves: [], measures: [], annotations: [] });
  });
});

describe("readMuseScore: 括弧", () => {
  const bracket = (systemBracket: number, bracketSpan: unknown) => ({ systemBracket, bracketSpan });
  const withBrackets = (staves: Fake[]): MsScore =>
    scoreOf([], {
      nstaves: staves.length,
      staves: staves.map((s, idx) => ({ idx, ...s })),
    });

  it("開始譜表に付いた括弧を種類と span ごと読む", () => {
    const score = read(
      withBrackets([
        { brackets: [bracket(BracketType.NORMAL, 4), bracket(BracketType.SQUARE, 2)] },
        {},
        { brackets: [bracket(BracketType.BRACE, 2)] },
        { brackets: [bracket(BracketType.LINE, 2)] },
      ]),
    );
    expect(score.partGroups).toEqual([
      { symbol: "bracket", firstStaff: 0, staffCount: 4 },
      { symbol: "square", firstStaff: 0, staffCount: 2 },
      { symbol: "brace", firstStaff: 2, staffCount: 2 },
      { symbol: "line", firstStaff: 3, staffCount: 2 },
    ]);
  });

  it("NO_BRACKET・実行中の版に無い値・span が数でない括弧は採らない", () => {
    const score = read(
      withBrackets([
        {
          brackets: [
            bracket(BracketType.NO_BRACKET, 4),
            bracket(999, 4),
            bracket(BracketType.NORMAL, undefined),
          ],
        },
        {},
      ]),
    );
    expect(score.partGroups).toEqual([]);
  });

  it("括弧の種類はホストの BracketType から解決する", () => {
    // 実機の BracketType.NORMAL は 0
    const score = read(withBrackets([{ brackets: [bracket(0, 2)] }, {}]));
    expect(score.partGroups).toEqual([]);
  });

  it("譜表の idx が無ければ並び順を開始譜表にする", () => {
    const score = scoreOf([], {
      nstaves: 3,
      staves: [{}, {}, { brackets: [bracket(BracketType.BRACE, 2)] }],
    });
    expect(read(score).partGroups).toEqual([{ symbol: "brace", firstStaff: 2, staffCount: 2 }]);
  });
});

describe("readMuseScore: 注記", () => {
  const annotate = (annotations: Fake[]): Annotation[] =>
    read(oneSegment({}, annotations)).annotations;

  it("楽譜全体の注記は score スコープ、譜表に紐づく注記は staff スコープ", () => {
    const annotations = annotate([
      { name: "SystemText", plainText: "Ⅰ", staffIdx: -1 },
      { name: "StaffText", plainText: "solo", track: 5 },
      { name: "StaffText", plainText: "tutti", staffIdx: 1 },
    ]);
    expect(annotations.map((a) => a.scope)).toEqual([
      { type: "score" },
      { type: "staff", staff: 1 },
      { type: "staff", staff: 1 },
    ]);
  });

  it("テキストが空の注記と、ルールが扱わない種類の注記は読まない", () => {
    const annotations = annotate([
      { name: "StaffText", plainText: "  ", track: 0 },
      { name: "Lyrics", plainText: "la", track: 0 },
      { name: "Harmony", plainText: "C7", track: 0 },
      { name: "StaffText", plainText: "<b>solo</b>", track: 0 },
    ]);
    expect(annotations.map((a) => a.text)).toEqual(["solo"]);
  });

  it("注記の位置は属するセグメントの tick と小節の通し番号", () => {
    const score = read(
      scoreOf([
        measure(0, [segment(0)]),
        measure(1, [
          segment(5 * QUARTER, {}, [{ name: "StaffText", plainText: "solo", track: 0 }]),
        ]),
      ]),
    );
    expect(score.annotations[0]).toMatchObject({ tick: 5 * QUARTER, measure: 2 });
  });

  it("強弱記号は SMuFL 名から文字へ直し、dynamic として読む", () => {
    const [dynamic] = annotate([
      { name: "Dynamic", plainText: "dynamicMezzodynamicForte", track: 0 },
    ]);
    expect(dynamic).toMatchObject({ kind: "dynamic", text: "mf" });
    expect(dynamic?.directives).toEqual([{ type: "dynamic", mark: "mf", modifier: "" }]);
  });

  it("練習記号とテンポ記号の種類を持ち込む", () => {
    const annotations = annotate([
      { name: "RehearsalMark", plainText: "A", track: 0 },
      { name: "Tempo", plainText: "Moderato", track: 0, tempo: 1 },
    ]);
    expect(annotations.map((a) => a.kind)).toEqual(["rehearsal", "tempo"]);
  });

  describe("テンポの BPM", () => {
    const tempoBpm = (tempo: unknown) => {
      const [annotation] = annotate([{ name: "Tempo", plainText: "Allegro", track: 0, tempo }]);
      return annotation?.directives.find((d) => d.type === "tempo");
    };

    it("拍/秒を BPM に換算する", () => {
      expect(tempoBpm(2)).toMatchObject({ bpm: 120 });
    });

    it("取れないとき・0 のときは NaN や 0 ではなく null にする", () => {
      for (const broken of [undefined, null, "fast", Number.NaN, 0]) {
        expect(tempoBpm(broken), String(broken)).toMatchObject({ bpm: null });
      }
    });
  });

  describe("奏法の種類（PlayTechAnnotation）", () => {
    const techniques = (plainText: string, playTechType: number) =>
      directivesOf(annotate([{ name: "PlayTechAnnotation", plainText, track: 0, playTechType }]))
        .filter((d) => d.type === "technique")
        .map((d) => d.technique);

    it("テキストで読めないときだけ種類から決める", () => {
      expect(techniques("pizz", PlayingTechniqueType.Pizzicato)).toEqual(["pizz"]);
      expect(techniques("ピチカート", PlayingTechniqueType.Pizzicato)).toEqual(["pizz"]);
      expect(techniques("col legno", PlayingTechniqueType.ColLegno)).toEqual(["col-legno"]);
      expect(techniques("糸巻き", PlayingTechniqueType.SulPonticello)).toEqual(["sul-pont"]);
      expect(techniques("糸巻き", PlayingTechniqueType.SulTasto)).toEqual(["sul-tasto"]);
    });

    it("テキストで読めるなら、種類が食い違ってもテキストを採る", () => {
      expect(techniques("arco", PlayingTechniqueType.Pizzicato)).toEqual(["arco"]);
      expect(techniques("con sord.", PlayingTechniqueType.Mute)).toEqual(["con-sord"]);
    });

    it("1 つに決まらない種類（Natural・Mute）は奏法にしない", () => {
      expect(techniques("???", PlayingTechniqueType.Natural)).toEqual([]);
      expect(techniques("???", PlayingTechniqueType.Mute)).toEqual([]);
    });

    it("実行中の版に無い種類の値でも落ちず、奏法にしない", () => {
      expect(techniques("???", 999)).toEqual([]);
    });
  });
});
