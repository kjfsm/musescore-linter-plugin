import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Annotation, Chord, Rest, Score } from "@score-linter/score-model";
import { TICKS_PER_QUARTER, tpcToAlter, tpcToName } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { readMusicXml } from "../src/reader.js";

const QUARTER = TICKS_PER_QUARTER;
const WHOLE = QUARTER * 4;

const duet = readFileSync(join(__dirname, "fixtures", "duet.musicxml"), "utf8");

function chordsOf(score: Score, staff?: number): Chord[] {
  return score.staves
    .filter((s) => staff === undefined || s.index === staff)
    .flatMap((s) => s.voices.flatMap((v) => v.events))
    .filter((e): e is Chord => e.type === "chord")
    .sort((a, b) => a.tick - b.tick);
}

function restsOf(score: Score): Rest[] {
  return score.staves
    .flatMap((s) => s.voices.flatMap((v) => v.events))
    .filter((e): e is Rest => e.type === "rest");
}

function annotationsOf(score: Score, kind: Annotation["kind"], staff?: number): Annotation[] {
  return score.annotations
    .filter((a) => a.kind === kind)
    .filter((a) => staff === undefined || (a.scope.type === "staff" && a.scope.staff === staff))
    .sort((a, b) => a.tick - b.tick);
}

/** 最小の score-partwise を組み立てるヘルパー（divisions=1 → 四分音符 1 単位）。 */
function scoreXml(partBody: string, partName = "Vn1"): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>${partName}</part-name></score-part></part-list>
  <part id="P1">${partBody}</part>
</score-partwise>`;
}

/**
 * `<part-list>` を丸ごと差し替えられる版。`part-group` の入れ子を組むのに使う。
 * `partIds` の順が `<part>` の出現順（＝ 譜表番号の採番順）になる。
 */
function scoreWithPartList(partListInner: string, partIds: string[], staves = 1): string {
  const attrs = `<attributes><divisions>1</divisions>${staves > 1 ? `<staves>${staves}</staves>` : ""}</attributes>`;
  const parts = partIds
    .map(
      (id) =>
        `<part id="${id}"><measure number="1">${attrs}<note><rest/><duration>1</duration><voice>1</voice></note></measure></part>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>${partListInner}</part-list>
  ${parts}
</score-partwise>`;
}

const scorePart = (id: string): string =>
  `<score-part id="${id}"><part-name>${id}</part-name></score-part>`;
const groupStart = (n: number, symbol?: string): string =>
  `<part-group type="start" number="${n}">${symbol ? `<group-symbol>${symbol}</group-symbol>` : ""}</part-group>`;
const groupStop = (n: number): string => `<part-group type="stop" number="${n}"/>`;

function measure(inner: string, number = 1): string {
  return `<measure number="${number}">
    <attributes><divisions>1</divisions><clef><sign>G</sign><line>2</line></clef></attributes>
    ${inner}
  </measure>`;
}

function quarterNote(step: string, octave: number, extra = ""): string {
  return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>
    <duration>1</duration><voice>1</voice><type>quarter</type>${extra}</note>`;
}

describe("readMusicXml: part-group（システムブラケット）", () => {
  it("括弧が無ければ空配列", () => {
    expect(readMusicXml(duet).partGroups).toEqual([]);
  });

  it("入れ子の bracket + square を外側が先の順で読む", () => {
    const score = readMusicXml(
      scoreWithPartList(
        [
          groupStart(1, "bracket"),
          groupStart(2, "square"),
          scorePart("P1"),
          scorePart("P2"),
          groupStop(2),
          groupStart(2, "square"),
          scorePart("P3"),
          scorePart("P4"),
          groupStop(2),
          groupStop(1),
        ].join(""),
        ["P1", "P2", "P3", "P4"],
      ),
    );
    expect(score.partGroups).toEqual([
      { symbol: "bracket", firstStaff: 0, staffCount: 4 },
      { symbol: "square", firstStaff: 0, staffCount: 2 },
      { symbol: "square", firstStaff: 2, staffCount: 2 },
    ]);
  });

  it("group-symbol 省略（既定 none）は括弧として採らないが、入れ子の対応は崩さない", () => {
    const score = readMusicXml(
      scoreWithPartList(
        [
          groupStart(1),
          scorePart("P1"),
          groupStart(2, "square"),
          scorePart("P2"),
          scorePart("P3"),
          groupStop(2),
          groupStop(1),
        ].join(""),
        ["P1", "P2", "P3"],
      ),
    );
    expect(score.partGroups).toEqual([{ symbol: "square", firstStaff: 1, staffCount: 2 }]);
  });

  it("対応する start が無い stop は無視する", () => {
    const score = readMusicXml(
      scoreWithPartList([groupStop(3), scorePart("P1"), scorePart("P2")].join(""), ["P1", "P2"]),
    );
    expect(score.partGroups).toEqual([]);
  });

  it("閉じ忘れたグループも拾う", () => {
    const score = readMusicXml(
      scoreWithPartList([groupStart(1, "bracket"), scorePart("P1"), scorePart("P2")].join(""), [
        "P1",
        "P2",
      ]),
    );
    expect(score.partGroups).toEqual([{ symbol: "bracket", firstStaff: 0, staffCount: 2 }]);
  });

  it("複数譜表のパートは譜表数ぶん span を広げる", () => {
    const score = readMusicXml(
      scoreWithPartList(
        [groupStart(1, "brace"), scorePart("P1"), groupStop(1)].join(""),
        ["P1"],
        2,
      ),
    );
    expect(score.partGroups).toEqual([{ symbol: "brace", firstStaff: 0, staffCount: 2 }]);
  });

  it("<part> が無い score-part は範囲計算から外す", () => {
    const score = readMusicXml(
      scoreWithPartList(
        [
          groupStart(1, "bracket"),
          scorePart("P1"),
          scorePart("GHOST"),
          scorePart("P2"),
          groupStop(1),
        ].join(""),
        ["P1", "P2"],
      ),
    );
    expect(score.partGroups).toEqual([{ symbol: "bracket", firstStaff: 0, staffCount: 2 }]);
  });

  it("Object.prototype のメンバ名を group-symbol に書かれても採らない", () => {
    // 素のオブジェクトで引くと constructor / toString が prototype 経由で truthy になり、
    // symbol に関数が入って JSON.stringify で消える（Score が純データでなくなる）。
    for (const evil of ["constructor", "toString", "hasOwnProperty", "__proto__"]) {
      const score = readMusicXml(
        scoreWithPartList(
          [groupStart(1, evil), scorePart("P1"), scorePart("P2"), groupStop(1)].join(""),
          ["P1", "P2"],
        ),
      );
      expect(score.partGroups).toEqual([]);
    }
  });

  it("1 譜表しか覆わない括弧は落とす（MuseScore 経路と揃える）", () => {
    const score = readMusicXml(
      scoreWithPartList(
        [groupStart(1, "bracket"), scorePart("P1"), groupStop(1), scorePart("P2")].join(""),
        ["P1", "P2"],
      ),
    );
    expect(score.partGroups).toEqual([]);
  });

  it("<part> の順とズレて飛び地になる括弧は捨てる", () => {
    // part-list は P1,P2,P3 の順だが <part> は P1,P3,P2 の順。
    // 括弧は P1 と P2（=譜表 0 と 2）を囲むので譜表 1 を跨いだ飛び地になる。
    const score = readMusicXml(
      scoreWithPartList(
        [
          groupStart(1, "bracket"),
          scorePart("P1"),
          scorePart("P2"),
          groupStop(1),
          scorePart("P3"),
        ].join(""),
        ["P1", "P3", "P2"],
      ),
    );
    expect(score.partGroups).toEqual([]);
  });
});

describe("readMusicXml: パートと譜表", () => {
  it("part-list の順に譜表を採番し、パート名を引き継ぐ", () => {
    const score = readMusicXml(duet);
    expect(score.parts).toEqual([
      { id: "P1", name: "Violin I", staves: [0] },
      { id: "P2", name: "Violin II", staves: [1] },
    ]);
    expect(score.staves.map((s) => [s.index, s.partId])).toEqual([
      [0, "P1"],
      [1, "P2"],
    ]);
  });

  it("同名の別パートは part id で区別する", () => {
    const named = (id: string) =>
      `<score-part id="${id}"><part-name>Horn in F</part-name></score-part>`;
    const score = readMusicXml(scoreWithPartList(named("P1") + named("P2"), ["P1", "P2"]));
    expect(score.parts).toEqual([
      { id: "P1", name: "Horn in F", staves: [0] },
      { id: "P2", name: "Horn in F", staves: [1] },
    ]);
  });

  it("part-name が空なら Staff N にフォールバックする", () => {
    const score = readMusicXml(
      scoreXml(measure(quarterNote("C", 4)), "").replace("<part-name></part-name>", "<part-name/>"),
    );
    expect(score.parts[0]?.name).toBe("Staff 1");
  });

  it("複数譜表のパートは 1 つの Part が複数の譜表を持ち、譜表ごとに音符が振り分けられる", () => {
    const score = readMusicXml(
      scoreXml(
        `<measure number="1">
        <attributes><divisions>1</divisions><staves>2</staves>
          <clef number="1"><sign>G</sign><line>2</line></clef>
          <clef number="2"><sign>F</sign><line>4</line></clef>
        </attributes>
        ${quarterNote("C", 5, "<staff>1</staff>")}
        <backup><duration>1</duration></backup>
        ${quarterNote("C", 3, "<staff>2</staff>")}
      </measure>`,
        "Piano",
      ),
    );
    expect(score.parts).toEqual([{ id: "P1", name: "Piano", staves: [0, 1] }]);
    expect(score.staves.map((s) => s.partId)).toEqual(["P1", "P1"]);
    expect(chordsOf(score, 0)).toHaveLength(1);
    expect(chordsOf(score, 1)).toHaveLength(1);
  });
});

describe("readMusicXml: tick と小節", () => {
  it("divisions に関わらず四分音符 = TICKS_PER_QUARTER tick に正規化する", () => {
    // fixture は divisions=2、つまり 1 division = 八分音符
    const chords = chordsOf(readMusicXml(duet), 0);
    expect(chords.slice(0, 4).map((c) => c.tick)).toEqual([0, QUARTER, QUARTER * 2, QUARTER * 3]);
  });

  it("小節番号は 1 始まりの連番、tick は小節をまたいで累積する", () => {
    const chords = chordsOf(readMusicXml(duet), 0);
    const m2 = chords.filter((c) => c.measure === 2);
    expect(m2.map((c) => c.tick)).toEqual([WHOLE, WHOLE + QUARTER * 2]);
    expect(chords.filter((c) => c.measure === 3)[0]?.tick).toBe(WHOLE * 2);
  });

  it("backup で戻った位置に別声部を積む", () => {
    const score = readMusicXml(
      scoreXml(
        measure(`${quarterNote("C", 4, "<voice>1</voice>")}
        <backup><duration>1</duration></backup>
        <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration>
          <voice>2</voice><type>quarter</type></note>`),
      ),
    );
    const voices = score.staves[0]?.voices ?? [];
    expect(voices).toHaveLength(2);
    expect(voices.map((v) => v.events.map((e) => e.tick))).toEqual([[0], [0]]);
  });

  it("和音（<chord/>）は 1 イベントに統合し、tick を進めない", () => {
    const score = readMusicXml(
      scoreXml(
        measure(`${quarterNote("C", 4)}
        <note><chord/><pitch><step>E</step><octave>4</octave></pitch>
          <duration>1</duration><voice>1</voice><type>quarter</type></note>
        ${quarterNote("G", 4)}`),
      ),
    );
    const chords = chordsOf(score);
    expect(chords).toHaveLength(2);
    expect(chords[0]?.notes).toHaveLength(2);
    expect(chords[1]?.tick).toBe(QUARTER);
  });

  it("グレースノートは Score に含めない", () => {
    const score = readMusicXml(
      scoreXml(
        measure(`<note><grace/><pitch><step>B</step><octave>3</octave></pitch>
          <voice>1</voice><type>16th</type></note>
        ${quarterNote("C", 4)}`),
      ),
    );
    expect(chordsOf(score)).toHaveLength(1);
  });
});

describe("readMusicXml: テキストと強弱", () => {
  it("words + sound tempo は tempo 注記になり、tempo ディレクティブに BPM が入る", () => {
    const tempos = annotationsOf(readMusicXml(duet), "tempo");
    expect(tempos).toHaveLength(1);
    expect(tempos[0]?.text).toBe("Allegro");
    expect(tempos[0]?.directives).toContainEqual({ type: "tempo", bpm: 120, word: "allegro" });
  });

  it("metronome の beat-unit を四分音符換算した BPM にする", () => {
    const score = readMusicXml(
      scoreXml(
        measure(`<direction><direction-type>
          <metronome><beat-unit>half</beat-unit><per-minute>60</per-minute></metronome>
        </direction-type></direction>${quarterNote("C", 4)}`),
      ),
    );
    const tempo = annotationsOf(score, "tempo")[0];
    expect(tempo?.text).toBe("half = 60");
    expect(tempo?.directives).toContainEqual(expect.objectContaining({ type: "tempo", bpm: 120 }));
  });

  it("dynamics の子要素名がそのまま記号になる", () => {
    const dynamics = annotationsOf(readMusicXml(duet), "dynamic");
    expect(dynamics.map((a) => a.text)).toEqual(["f", "mf"]);
    expect(dynamics.map((a) => a.directives)).toEqual([
      [{ type: "dynamic", mark: "f", modifier: "" }],
      [{ type: "dynamic", mark: "mf", modifier: "" }],
    ]);
  });

  it("words だけの direction は text 注記になり、書かれたままの文字を保つ", () => {
    const texts = annotationsOf(readMusicXml(duet), "text", 0);
    expect(texts.map((a) => a.text)).toEqual(["pizz.", "arco"]);
    expect(texts.map((a) => a.directives)).toEqual([
      [{ type: "technique", technique: "pizz" }],
      [{ type: "technique", technique: "arco" }],
    ]);
  });

  // MusicXML の <words> には要素の種類が無いので、MuseScore 経路（isTempo で
  // 判定できる）と揃えるにはテキストで見るしかない。ここを text に落としていると
  // opening-tempo が「冒頭にテンポ表記がありません」と誤報する。
  it("BPM も metronome も無いテンポ語だけの direction を tempo 注記にする", () => {
    const score = readMusicXml(
      scoreXml(
        measure(`<direction><direction-type><words>Allegro con brio</words></direction-type></direction>
        ${quarterNote("C", 4)}`),
      ),
    );
    const tempos = annotationsOf(score, "tempo");
    expect(tempos).toHaveLength(1);
    expect(tempos[0]?.text).toBe("Allegro con brio");
    // BPM は書かれていないので null のまま。tempo-without-bpm がこれを拾う。
    expect(tempos[0]?.directives).toContainEqual(
      expect.objectContaining({ type: "tempo", bpm: null }),
    );
    expect(annotationsOf(score, "text")).toHaveLength(0);
  });

  it("テンポ語でないテキストは text 注記のままにする", () => {
    const score = readMusicXml(
      scoreXml(
        measure(`<direction><direction-type><words>dolce</words></direction-type></direction>
        <direction><direction-type><words>rit.</words></direction-type></direction>
        <direction><direction-type><words>a tempo</words></direction-type></direction>
        ${quarterNote("C", 4)}`),
      ),
    );
    expect(annotationsOf(score, "tempo")).toHaveLength(0);
    expect(annotationsOf(score, "text").map((a) => a.text)).toEqual(["dolce", "rit.", "a tempo"]);
  });

  it("segno / coda は反復記号のディレクティブ付きの text 注記に、rehearsal は rehearsal 注記にする", () => {
    const score = readMusicXml(
      scoreXml(
        measure(`<direction><direction-type><segno/></direction-type></direction>
        <direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>
        <direction><direction-type><coda/></direction-type></direction>
        ${quarterNote("C", 4)}`),
      ),
    );
    const texts = annotationsOf(score, "text");
    expect(texts.map((a) => a.directives)).toEqual([
      [{ type: "repeat", mark: "segno" }],
      [{ type: "repeat", mark: "coda" }],
    ]);
    const rehearsal = annotationsOf(score, "rehearsal")[0];
    expect(rehearsal?.text).toBe("A");
    expect(rehearsal?.directives).toEqual([{ type: "rehearsal", label: "A" }]);
  });

  it("注記は書かれた譜表に紐づく", () => {
    const score = readMusicXml(duet);
    const pizz = annotationsOf(score, "text", 0)[0];
    expect(pizz?.scope).toEqual({ type: "staff", staff: 0 });
  });
});

describe("readMusicXml: スパナ", () => {
  it("slur を start/stop の tick で slurs に積む", () => {
    expect(readMusicXml(duet).slurs).toEqual([
      { staff: 0, voice: 0, startTick: 0, endTick: QUARTER * 3 },
    ]);
  });

  it("wedge を hairpin として hairpins に積む", () => {
    expect(readMusicXml(duet).hairpins).toEqual([
      { staff: 0, startTick: WHOLE, endTick: WHOLE + QUARTER * 4 },
    ]);
  });

  it("同音高のタイは startPitch === endPitch で積む", () => {
    const tie = readMusicXml(duet).ties.find((t) => t.staff === 0);
    expect(tie).toEqual({
      staff: 0,
      voice: 0,
      startTick: WHOLE,
      endTick: WHOLE + QUARTER * 2,
      startPitch: 64,
      endPitch: 64,
    });
  });

  it("異音程のタイも開始と終了を対応づけ、両端の音高を保持する", () => {
    const tie = readMusicXml(duet).ties.find((t) => t.staff === 1);
    expect(tie?.startPitch).toBe(55); // G3
    expect(tie?.endPitch).toBe(57); // A3
  });
});

describe("readMusicXml: 音符情報", () => {
  it("pitch / tpc / accidentalShown を埋める", () => {
    const [c4, d4, eb4] = chordsOf(readMusicXml(duet), 0);
    expect(c4?.notes[0]).toMatchObject({ pitch: 60, tpc: 14, accidentalShown: false });
    expect(d4?.notes[0]).toMatchObject({ pitch: 62, accidentalShown: false });
    expect(eb4?.notes[0]).toMatchObject({ pitch: 63, accidentalShown: true });
    expect(tpcToName(eb4?.notes[0]?.tpc ?? 0)).toBe("Eb");
    expect(tpcToAlter(eb4?.notes[0]?.tpc ?? 0)).toBe(-1);
  });

  it("同じ音名・同じオクターブなら line が一致し、オクターブ違いでは異なる", () => {
    const score = readMusicXml(
      scoreXml(measure(`${quarterNote("E", 4)}${quarterNote("E", 4)}${quarterNote("E", 5)}`)),
    );
    const [a, b, c] = chordsOf(score);
    expect(a?.notes[0]?.line).toBe(b?.notes[0]?.line);
    expect(c?.notes[0]?.line).toBe((a?.notes[0]?.line ?? 0) - 7);
  });

  it("articulation を MuseScore 名に正規化する", () => {
    const staccato = chordsOf(readMusicXml(duet), 0)[1];
    expect(staccato?.articulations).toEqual(["Staccato"]);
  });

  it("duration は全音符を 1 とする既約分数になる", () => {
    const score = readMusicXml(
      scoreXml(
        measure(`${quarterNote("C", 4, "<dot/>")}
        <note><rest/><duration>2</duration><voice>1</voice><type>half</type></note>`),
      ),
    );
    expect(chordsOf(score)[0]?.duration).toEqual({ numerator: 3, denominator: 8 });
    expect(restsOf(score)[0]?.duration).toEqual({ numerator: 1, denominator: 2 });
  });
});

describe("readMusicXml: 小節線", () => {
  it("light-heavy を final として全譜表に積み、tick は小節末になる", () => {
    const score = readMusicXml(duet);
    const bars = score.staves.flatMap((s) => s.barlines).filter((b) => b.kind !== "other");
    expect(bars).toHaveLength(2); // 2 パート × 1 本
    for (const bar of bars) {
      expect(bar.kind).toBe("final");
      expect(bar.tick).toBe(WHOLE * 3);
      expect(bar.measure).toBe(3);
    }
  });

  // MuseScore から読んだ Score はすべての小節の終わりに小節線を持つ。揃えないと、
  // 「直前の小節線」を見るルールがソースによって違う線を見る。
  it("書かれていない小節の終わりの線を other で補う", () => {
    const bars = readMusicXml(duet).staves[0]?.barlines ?? [];
    expect(bars.map((b) => [b.measure, b.tick, b.kind])).toEqual([
      [1, WHOLE, "other"],
      [2, WHOLE * 2, "other"],
      [3, WHOLE * 3, "final"],
    ]);
  });

  it("repeat の direction を repeat-start / repeat-end に振り分ける", () => {
    const score = readMusicXml(
      scoreXml(
        `${measure(
          `<barline location="left"><bar-style>heavy-light</bar-style>
          <repeat direction="forward"/></barline>${quarterNote("C", 4)}`,
          1,
        )}${measure(
          `${quarterNote("D", 4)}<barline location="right">
          <bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>`,
          2,
        )}`,
      ),
    );
    const bars = score.staves[0]?.barlines ?? [];
    expect(bars.map((b) => [b.measure, b.tick, b.kind])).toEqual([
      [1, 0, "repeat-start"],
      [1, QUARTER, "other"],
      [2, QUARTER * 2, "repeat-end"],
    ]);
  });
});

describe("readMusicXml: 小節の枠組み（measures）", () => {
  it("<time> から拍子・小節先頭 tick・小節長を拾う", () => {
    expect(readMusicXml(duet).measures).toEqual([
      {
        serial: 1,
        label: "1",
        startTick: 0,
        ticks: WHOLE,
        timeSignature: { numerator: 4, denominator: 4 },
      },
      {
        serial: 2,
        label: "2",
        startTick: WHOLE,
        ticks: WHOLE,
        timeSignature: { numerator: 4, denominator: 4 },
      },
      {
        serial: 3,
        label: "3",
        startTick: WHOLE * 2,
        ticks: WHOLE,
        timeSignature: { numerator: 4, denominator: 4 },
      },
    ]);
  });

  it("<time> は次の変更まで持ち回る", () => {
    const withTime = (n: number, d: number) =>
      `<time><beats>${n}</beats><beat-type>${d}</beat-type></time>`;
    const score = readMusicXml(
      scoreXml(
        `<measure number="1">
          <attributes><divisions>1</divisions>${withTime(3, 4)}</attributes>
          ${quarterNote("C", 4)}${quarterNote("D", 4)}${quarterNote("E", 4)}
        </measure>
        <measure number="2">
          ${quarterNote("C", 4)}${quarterNote("D", 4)}${quarterNote("E", 4)}
        </measure>`,
      ),
    );
    expect(score.measures).toEqual([
      {
        serial: 1,
        label: "1",
        startTick: 0,
        ticks: QUARTER * 3,
        timeSignature: { numerator: 3, denominator: 4 },
      },
      {
        serial: 2,
        label: "2",
        startTick: QUARTER * 3,
        ticks: QUARTER * 3,
        timeSignature: { numerator: 3, denominator: 4 },
      },
    ]);
  });

  it("拍子が無い譜面でも小節は作り、timeSignature は null になる", () => {
    const score = readMusicXml(scoreXml(measure(quarterNote("C", 4))));
    expect(score.measures).toEqual([
      { serial: 1, label: "1", startTick: 0, ticks: QUARTER, timeSignature: null },
    ]);
  });

  it("加算拍子（複数の <beats>）は拍子なしとして扱う", () => {
    const score = readMusicXml(
      scoreXml(
        `<measure number="1">
          <attributes><divisions>1</divisions>
            <time><beats>3</beats><beat-type>8</beat-type><beats>2</beats><beat-type>8</beat-type></time>
          </attributes>
          ${quarterNote("C", 4)}
        </measure>`,
      ),
    );
    expect(score.measures.map((m) => m.timeSignature)).toEqual([null]);
  });

  it("表示される小節番号は label に、通し番号は serial に入る", () => {
    const score = readMusicXml(
      scoreXml(`${measure(quarterNote("C", 4), 0)}${measure(quarterNote("D", 4), 1)}`),
    );
    expect(score.measures.map((m) => [m.serial, m.label])).toEqual([
      [1, "0"],
      [2, "1"],
    ]);
  });
});

describe("readMusicXml: エラー", () => {
  it("score-timewise は明示的に非対応と伝える", () => {
    expect(() => readMusicXml('<?xml version="1.0"?><score-timewise/>')).toThrow(/score-timewise/);
  });

  it("MusicXML でない XML はルート要素が無いと伝える", () => {
    expect(() => readMusicXml("<html><body/></html>")).toThrow(/score-partwise/);
  });
});
