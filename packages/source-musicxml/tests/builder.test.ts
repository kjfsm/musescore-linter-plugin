import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { LintEvent, LintIR } from "@musescore-linter/core";
import { CANONICAL, tpcToAlter, tpcToName } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { buildIRFromMusicXML, TICKS_PER_QUARTER } from "../src/builder.js";

const K = CANONICAL.elementKinds;
const BK = CANONICAL.barlineKinds;
const QUARTER = TICKS_PER_QUARTER;
const WHOLE = QUARTER * 4;

const duet = readFileSync(join(__dirname, "fixtures", "duet.musicxml"), "utf8");

function eventsOfKind(ir: LintIR, kind: string, staffIdx?: number): LintEvent[] {
  return (ir.index.byKind[kind] ?? [])
    .map((id) => ir.events[id])
    .filter((ev) => staffIdx === undefined || ev.staffIdx === staffIdx)
    .sort((a, b) => a.tick - b.tick);
}

/** 最小の score-partwise を組み立てるヘルパー（divisions=1 → 四分音符 1 単位）。 */
function score(partBody: string, partName = "Vn1"): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>${partName}</part-name></score-part></part-list>
  <part id="P1">${partBody}</part>
</score-partwise>`;
}

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

describe("buildIRFromMusicXML: パートと譜表", () => {
  it("part-list の順に staffIdx を採番し partName を引き継ぐ", () => {
    const ir = buildIRFromMusicXML(duet);
    expect(ir.meta.parts).toEqual([
      { staffIdx: 0, partName: "Violin I" },
      { staffIdx: 1, partName: "Violin II" },
    ]);
  });

  it("part-name が空なら Staff N にフォールバックする", () => {
    const ir = buildIRFromMusicXML(
      score(measure(quarterNote("C", 4)), "").replace("<part-name></part-name>", "<part-name/>"),
    );
    expect(ir.meta.parts[0].partName).toBe("Staff 1");
  });

  it("複数譜表のパートは staves の数だけ meta.parts を作り、同じ partName を共有する", () => {
    const ir = buildIRFromMusicXML(
      score(
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
    expect(ir.meta.parts).toEqual([
      { staffIdx: 0, partName: "Piano" },
      { staffIdx: 1, partName: "Piano" },
    ]);
    expect(eventsOfKind(ir, K.CHORD, 0)).toHaveLength(1);
    expect(eventsOfKind(ir, K.CHORD, 1)).toHaveLength(1);
  });
});

describe("buildIRFromMusicXML: tick と小節", () => {
  it("divisions に関わらず四分音符 = 480 tick に正規化する", () => {
    // fixture は divisions=2、つまり 1 division = 八分音符
    const ir = buildIRFromMusicXML(duet);
    const chords = eventsOfKind(ir, K.CHORD, 0);
    expect(chords.slice(0, 4).map((c) => c.tick)).toEqual([0, QUARTER, QUARTER * 2, QUARTER * 3]);
  });

  it("小節番号は 1 始まりの連番、tick は小節をまたいで累積する", () => {
    const ir = buildIRFromMusicXML(duet);
    const chords = eventsOfKind(ir, K.CHORD, 0);
    const m2 = chords.filter((c) => c.measure === 2);
    expect(m2.map((c) => c.tick)).toEqual([WHOLE, WHOLE + QUARTER * 2]);
    expect(chords.filter((c) => c.measure === 3)[0].tick).toBe(WHOLE * 2);
  });

  it("backup で戻った位置に別声部を積む", () => {
    const ir = buildIRFromMusicXML(
      score(
        measure(`${quarterNote("C", 4, "<voice>1</voice>")}
        <backup><duration>1</duration></backup>
        <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration>
          <voice>2</voice><type>quarter</type></note>`),
      ),
    );
    const chords = eventsOfKind(ir, K.CHORD);
    expect(chords).toHaveLength(2);
    expect(chords.map((c) => [c.tick, c.voice])).toEqual([
      [0, 0],
      [0, 1],
    ]);
  });

  it("和音（<chord/>）は 1 イベントに統合し、tick を進めない", () => {
    const ir = buildIRFromMusicXML(
      score(
        measure(`${quarterNote("C", 4)}
        <note><chord/><pitch><step>E</step><octave>4</octave></pitch>
          <duration>1</duration><voice>1</voice><type>quarter</type></note>
        ${quarterNote("G", 4)}`),
      ),
    );
    const chords = eventsOfKind(ir, K.CHORD);
    expect(chords).toHaveLength(2);
    expect(chords[0].notes).toHaveLength(2);
    expect(chords[1].tick).toBe(QUARTER);
  });

  it("グレースノートは IR に含めない", () => {
    const ir = buildIRFromMusicXML(
      score(
        measure(`<note><grace/><pitch><step>B</step><octave>3</octave></pitch>
          <voice>1</voice><type>16th</type></note>
        ${quarterNote("C", 4)}`),
      ),
    );
    expect(eventsOfKind(ir, K.CHORD)).toHaveLength(1);
  });
});

describe("buildIRFromMusicXML: テキストと強弱", () => {
  it("words + sound tempo は tempo_text になり tempo に BPM が入る", () => {
    const ir = buildIRFromMusicXML(duet);
    const tempos = eventsOfKind(ir, K.TEMPO_TEXT);
    expect(tempos).toHaveLength(1);
    expect(tempos[0].textRaw).toBe("Allegro");
    expect(tempos[0].textNorm).toBe("allegro");
    expect(tempos[0].tempo).toBe(120);
  });

  it("metronome の beat-unit を四分音符換算した BPM にする", () => {
    const ir = buildIRFromMusicXML(
      score(
        measure(`<direction><direction-type>
          <metronome><beat-unit>half</beat-unit><per-minute>60</per-minute></metronome>
        </direction-type></direction>${quarterNote("C", 4)}`),
      ),
    );
    const tempo = eventsOfKind(ir, K.TEMPO_TEXT)[0];
    expect(tempo.tempo).toBe(120);
    expect(tempo.textRaw).toBe("half = 60");
  });

  it("dynamics の子要素名がそのまま textNorm になる", () => {
    const ir = buildIRFromMusicXML(duet);
    expect(eventsOfKind(ir, K.DYNAMIC).map((e) => e.textNorm)).toEqual(["f", "mf"]);
  });

  it("words だけの direction は staff_text になり textNorm は小文字化される", () => {
    const ir = buildIRFromMusicXML(duet);
    const texts = eventsOfKind(ir, K.STAFF_TEXT, 0);
    expect(texts.map((e) => [e.textRaw, e.textNorm])).toEqual([
      ["pizz.", "pizz."],
      ["arco", "arco"],
    ]);
  });

  it("segno / coda / rehearsal を対応する kind に変換する", () => {
    const ir = buildIRFromMusicXML(
      score(
        measure(`<direction><direction-type><segno/></direction-type></direction>
        <direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>
        <direction><direction-type><coda/></direction-type></direction>
        ${quarterNote("C", 4)}`),
      ),
    );
    expect(eventsOfKind(ir, K.STAFF_TEXT).map((e) => e.textNorm)).toEqual(["segno", "coda"]);
    expect(eventsOfKind(ir, K.REHEARSAL_MARK)[0].textRaw).toBe("A");
  });
});

describe("buildIRFromMusicXML: スパナ", () => {
  it("slur を start/stop の tick で meta.slurs に積む", () => {
    const ir = buildIRFromMusicXML(duet);
    expect(ir.meta.slurs).toEqual([{ staffIdx: 0, voice: 0, startTick: 0, endTick: QUARTER * 3 }]);
  });

  it("wedge を hairpin として meta.hairpins に積む", () => {
    const ir = buildIRFromMusicXML(duet);
    expect(ir.meta.hairpins).toEqual([
      { staffIdx: 0, startTick: WHOLE, endTick: WHOLE + QUARTER * 4 },
    ]);
  });

  it("同音高のタイは startPitch === endPitch で積む", () => {
    const ir = buildIRFromMusicXML(duet);
    const tie = ir.meta.ties.find((t) => t.staffIdx === 0);
    expect(tie).toEqual({
      staffIdx: 0,
      voice: 0,
      startTick: WHOLE,
      endTick: WHOLE + QUARTER * 2,
      startPitch: 64,
      endPitch: 64,
    });
  });

  it("異音程のタイも開始と終了を対応づけ、両端の音高を保持する", () => {
    const ir = buildIRFromMusicXML(duet);
    const tie = ir.meta.ties.find((t) => t.staffIdx === 1);
    expect(tie?.startPitch).toBe(55); // G3
    expect(tie?.endPitch).toBe(57); // A3
  });
});

describe("buildIRFromMusicXML: 音符情報", () => {
  it("pitch / tpc / accidentalShown を埋める", () => {
    const ir = buildIRFromMusicXML(duet);
    const chords = eventsOfKind(ir, K.CHORD, 0);
    const [c4, d4, eb4] = chords;
    expect(c4.notes?.[0]).toMatchObject({
      pitch: 60,
      tpc: 14,
      accidentalShown: false,
    });
    expect(d4.notes?.[0]).toMatchObject({ pitch: 62, accidentalShown: false });
    expect(eb4.notes?.[0]).toMatchObject({ pitch: 63, accidentalShown: true });
    expect(tpcToName(eb4.notes?.[0].tpc ?? 0)).toBe("Eb");
    expect(tpcToAlter(eb4.notes?.[0].tpc ?? 0)).toBe(-1);
  });

  it("同じ音名・同じオクターブなら line が一致し、オクターブ違いでは異なる", () => {
    const ir = buildIRFromMusicXML(
      score(measure(`${quarterNote("E", 4)}${quarterNote("E", 4)}${quarterNote("E", 5)}`)),
    );
    const [a, b, c] = eventsOfKind(ir, K.CHORD);
    expect(a.notes?.[0].line).toBe(b.notes?.[0].line);
    expect(c.notes?.[0].line).toBe((a.notes?.[0].line ?? 0) - 7);
  });

  it("articulation を MuseScore 名に正規化する", () => {
    const ir = buildIRFromMusicXML(duet);
    const staccato = eventsOfKind(ir, K.CHORD, 0)[1];
    expect(staccato.articulations).toEqual(["Staccato"]);
  });

  it("duration は全音符を 1 とする既約分数になる", () => {
    const ir = buildIRFromMusicXML(
      score(
        measure(`${quarterNote("C", 4, "<dot/>")}
        <note><rest/><duration>2</duration><voice>1</voice><type>half</type></note>`),
      ),
    );
    expect(eventsOfKind(ir, K.CHORD)[0].duration).toEqual({
      numerator: 3,
      denominator: 8,
    });
    expect(eventsOfKind(ir, K.REST)[0].duration).toEqual({
      numerator: 1,
      denominator: 2,
    });
  });
});

describe("buildIRFromMusicXML: 小節線", () => {
  it("light-heavy を final として全譜表に積み、tick は小節末になる", () => {
    const ir = buildIRFromMusicXML(duet);
    const bars = eventsOfKind(ir, K.BAR_LINE);
    expect(bars).toHaveLength(2); // 2 パート × 1 本
    for (const bar of bars) {
      expect(bar.barlineKind).toBe(BK.FINAL);
      expect(bar.tick).toBe(WHOLE * 3);
      expect(bar.measure).toBe(3);
    }
  });

  it("repeat の direction を repeat_start / repeat_end に振り分ける", () => {
    const ir = buildIRFromMusicXML(
      score(
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
    const bars = eventsOfKind(ir, K.BAR_LINE);
    expect(bars.map((b) => [b.measure, b.tick, b.barlineKind])).toEqual([
      [1, 0, BK.REPEAT_START],
      [2, QUARTER * 2, BK.REPEAT_END],
    ]);
  });
});

describe("buildIRFromMusicXML: エラー", () => {
  it("score-timewise は明示的に非対応と伝える", () => {
    expect(() => buildIRFromMusicXML('<?xml version="1.0"?><score-timewise/>')).toThrow(
      /score-timewise/,
    );
  });

  it("MusicXML でない XML はルート要素が無いと伝える", () => {
    expect(() => buildIRFromMusicXML("<html><body/></html>")).toThrow(/score-partwise/);
  });
});
