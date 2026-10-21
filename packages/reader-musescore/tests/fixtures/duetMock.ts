import type { MuseScore, Score as MsScore } from "@score-linter/musescore-api-types";

// reader-musicxml/tests/fixtures/duet.musicxml と同じ楽譜を、MuseScore のプラグイン API の形で
// 組んだもの。enum の値は実際の MuseScore のどの版とも違う — 焼き込んだ値ではなく、
// ホストの enum から引いていることを確かめるため。
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
const BarLineType = { NORMAL: 200, END: 206 };
const Key = { F: 306, C: 307, G: 308 };

export const host = {
  NoteType,
  BarLineType,
  Key,
  BracketType: {},
  PlayingTechniqueType: {},
  mscoreMajorVersion: 4,
  mscoreMinorVersion: 7,
} as unknown as MuseScore;

const QUARTER = 480;

type Fake = Record<string, unknown>;

interface Slot {
  track: number;
  element: Fake;
}
interface NoteSpec {
  pitch: number;
  tpc: number;
  line: number;
  accidental?: boolean;
  articulations?: string[];
  tie?: { endTick: number; startPitch: number; endPitch: number };
  slur?: { ticks: number };
  hairpin?: { ticks: number };
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** MuseScore の Fraction は約分された形で届く。 */
const fraction = (ticks: number) => {
  const whole = 4 * QUARTER;
  const d = gcd(ticks, whole);
  return { numerator: ticks / d, denominator: whole / d };
};

const chord = (ticks: number, note: NoteSpec, startTick: number): Fake => ({
  name: "Chord",
  noteType: NoteType.NORMAL,
  duration: fraction(ticks),
  articulations: (note.articulations ?? []).map((name) => ({ subtypeName: () => name })),
  notes: [
    {
      pitch: note.pitch,
      tpc: note.tpc,
      line: note.line,
      accidental: note.accidental ? { name: "Accidental" } : null,
      tieForward: note.tie
        ? {
            name: "Tie",
            startNote: { pitch: note.tie.startPitch },
            endNote: { pitch: note.tie.endPitch },
            spannerTick: { ticks: startTick },
            spannerTicks: { ticks: note.tie.endTick - startTick },
          }
        : null,
      spannerForward: [
        ...(note.slur
          ? [
              {
                name: "Slur",
                spannerTick: { ticks: startTick },
                spannerTicks: { ticks: note.slur.ticks },
              },
            ]
          : []),
        ...(note.hairpin
          ? [
              {
                name: "Hairpin",
                spannerTick: { ticks: startTick },
                spannerTicks: { ticks: note.hairpin.ticks },
              },
            ]
          : []),
      ],
    },
  ],
});

const rest = (ticks: number): Fake => ({
  name: "Rest",
  duration: fraction(ticks),
});

interface SegmentSpec {
  tick: number;
  slots: Slot[];
  annotations?: Fake[];
}

function measureOf(no: number, specs: SegmentSpec[]) {
  const segments = specs.map((spec) => ({
    tick: spec.tick,
    annotations: spec.annotations ?? [],
    nextInMeasure: null as unknown,
    elementAt: (track: number) => spec.slots.find((s) => s.track === track)?.element ?? null,
  }));
  segments.forEach((seg, i) => {
    seg.nextInMeasure = segments[i + 1] ?? null;
  });
  return {
    no,
    tick: { ticks: no * 4 * QUARTER },
    ticks: { ticks: 4 * QUARTER },
    timesigNominal: { str: "4/4" },
    firstSegment: segments[0],
    lastSegment: segments[segments.length - 1],
    nextMeasure: null as unknown,
  };
}

/** duet.musicxml と同じ楽譜を、MuseScore のプラグイン API の形で組む。 */
export function duetScore(): MsScore {
  const barline = (tick: number, type: number): SegmentSpec => ({
    tick,
    slots: [
      { track: 0, element: { name: "BarLine", barlineType: type } },
      { track: 4, element: { name: "BarLine", barlineType: type } },
    ],
  });
  const q = QUARTER;

  // システムの頭の調号は生成されたもので、読まない
  const keySig = (tick: number, generated: boolean): SegmentSpec => ({
    tick,
    slots: [
      { track: 0, element: { name: "KeySig", actualKey: Key.C, generated } },
      { track: 4, element: { name: "KeySig", actualKey: Key.C, generated } },
    ],
  });

  const m1 = measureOf(0, [
    keySig(0, false),
    {
      tick: 0,
      annotations: [
        { name: "Tempo", plainText: "Allegro", track: 0, tempo: 2 },
        { name: "Dynamic", plainText: "dynamicForte", track: 0 },
        { name: "StaffText", plainText: "pizz.", track: 0 },
        { name: "Dynamic", plainText: "dynamicMezzodynamicForte", track: 4 },
      ],
      slots: [
        {
          track: 0,
          element: chord(q, { pitch: 60, tpc: 14, line: 10, slur: { ticks: 3 * q } }, 0),
        },
        { track: 4, element: chord(4 * q, { pitch: 60, tpc: 14, line: 10 }, 0) },
      ],
    },
    {
      tick: q,
      slots: [
        {
          track: 0,
          element: chord(q, { pitch: 62, tpc: 16, line: 9, articulations: ["Staccato"] }, q),
        },
      ],
    },
    {
      tick: 2 * q,
      slots: [
        {
          track: 0,
          element: chord(q, { pitch: 63, tpc: 11, line: 8, accidental: true }, 2 * q),
        },
      ],
    },
    {
      tick: 3 * q,
      slots: [{ track: 0, element: chord(q, { pitch: 65, tpc: 13, line: 7 }, 3 * q) }],
    },
    barline(4 * q, BarLineType.NORMAL),
  ]);

  const m2 = measureOf(1, [
    keySig(4 * q, true),
    {
      tick: 4 * q,
      slots: [
        {
          track: 0,
          element: chord(
            2 * q,
            {
              pitch: 64,
              tpc: 18,
              line: 8,
              hairpin: { ticks: 4 * q },
              tie: { endTick: 6 * q, startPitch: 64, endPitch: 64 },
            },
            4 * q,
          ),
        },
        {
          track: 4,
          element: chord(
            2 * q,
            {
              pitch: 55,
              tpc: 15,
              line: 13,
              tie: { endTick: 6 * q, startPitch: 55, endPitch: 57 },
            },
            4 * q,
          ),
        },
      ],
    },
    {
      tick: 6 * q,
      slots: [
        { track: 0, element: chord(2 * q, { pitch: 64, tpc: 18, line: 8 }, 6 * q) },
        { track: 4, element: chord(2 * q, { pitch: 57, tpc: 17, line: 12 }, 6 * q) },
      ],
    },
    barline(8 * q, BarLineType.NORMAL),
  ]);

  const m3 = measureOf(2, [
    {
      tick: 8 * q,
      annotations: [
        { name: "StaffText", plainText: "arco", track: 0 },
        { name: "Fermata", track: 4 },
      ],
      slots: [
        { track: 0, element: chord(2 * q, { pitch: 67, tpc: 15, line: 6 }, 8 * q) },
        { track: 4, element: chord(4 * q, { pitch: 60, tpc: 14, line: 10 }, 8 * q) },
      ],
    },
    {
      tick: 10 * q,
      annotations: [{ name: "Fermata", track: 0 }],
      slots: [{ track: 0, element: rest(2 * q) }],
    },
    barline(12 * q, BarLineType.END),
  ]);

  m1.nextMeasure = m2;
  m2.nextMeasure = m3;

  return {
    nstaves: 2,
    parts: [
      { startTrack: 0, endTrack: 4, longName: "Violin I" },
      { startTrack: 4, endTrack: 8, longName: "Violin II" },
    ],
    staves: [],
    firstMeasure: m1,
  } as unknown as MsScore;
}
