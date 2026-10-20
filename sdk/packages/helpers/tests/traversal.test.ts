import type {
  Chord,
  EngravingItem,
  Measure,
  Note,
  Score,
  Segment,
  Selection,
} from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import {
  iterateAnnotations,
  iterateChords,
  iterateMeasureSegments,
  iterateMeasures,
  iterateNotes,
  iterateSegments,
  iterateStaves,
} from "../src/traversal.js";

interface SegSpec {
  tick: number;
  segmentType: number;
  annotations?: EngravingItem[];
  elements: (EngravingItem | null)[];
}

interface MeasureSpec {
  no: number;
  segments: SegSpec[];
}

function buildScore(measures: MeasureSpec[], ntracks: number, selection: Selection | null = null) {
  const allSegments: Segment[] = [];
  const allMeasures: Measure[] = [];

  for (const mSpec of measures) {
    const segs: Segment[] = mSpec.segments.map((s) => {
      return {
        tick: s.tick,
        segmentType: s.segmentType,
        annotations: s.annotations ?? [],
        elementAt(track: number) {
          return s.elements[track] ?? null;
        },
        next: null,
        nextInMeasure: null,
      } as unknown as Segment;
    });
    for (let i = 0; i < segs.length - 1; i++) {
      (segs[i] as { nextInMeasure: Segment | null }).nextInMeasure = segs[i + 1] ?? null;
    }
    const measure = {
      no: mSpec.no,
      firstSegment: segs[0] ?? null,
      nextMeasure: null,
    } as unknown as Measure;
    allSegments.push(...segs);
    allMeasures.push(measure);
  }

  // Link segments globally via `next`.
  for (let i = 0; i < allSegments.length - 1; i++) {
    (allSegments[i] as { next: Segment | null }).next = allSegments[i + 1] ?? null;
  }
  // Link measures.
  for (let i = 0; i < allMeasures.length - 1; i++) {
    (allMeasures[i] as { nextMeasure: Measure | null }).nextMeasure = allMeasures[i + 1] ?? null;
  }

  const score = {
    firstMeasure: allMeasures[0] ?? null,
    ntracks,
    selection,
  } as unknown as Score;

  return { score, allSegments, allMeasures };
}

function chord(notes: Note[]): Chord {
  return { name: "Chord", notes } as unknown as Chord;
}
function note(label: string): Note {
  return { name: "Note", label } as unknown as Note;
}
function annotation(label: string): EngravingItem {
  return { name: "StaffText", label } as unknown as EngravingItem;
}

describe("iterateMeasureSegments", () => {
  it("yields all segments within a single measure", () => {
    const { allMeasures, allSegments } = buildScore(
      [
        {
          no: 0,
          segments: [
            { tick: 0, segmentType: 1, elements: [] },
            { tick: 480, segmentType: 1, elements: [] },
          ],
        },
      ],
      0,
    );
    const m = allMeasures[0] as Measure;
    expect(Array.from(iterateMeasureSegments(m))).toEqual(allSegments);
  });

  it("does not cross into the next measure", () => {
    const { allMeasures } = buildScore(
      [
        {
          no: 0,
          segments: [{ tick: 0, segmentType: 1, elements: [] }],
        },
        {
          no: 1,
          segments: [{ tick: 960, segmentType: 1, elements: [] }],
        },
      ],
      0,
    );
    const m0 = allMeasures[0] as Measure;
    const segs = Array.from(iterateMeasureSegments(m0));
    expect(segs).toHaveLength(1);
    expect(segs[0]?.tick).toBe(0);
  });

  it("yields nothing for a measure with no segments", () => {
    const { allMeasures } = buildScore([{ no: 0, segments: [] }], 0);
    expect(Array.from(iterateMeasureSegments(allMeasures[0] as Measure))).toEqual([]);
  });

  it("filters by segmentType bitmask", () => {
    const { allMeasures } = buildScore(
      [
        {
          no: 0,
          segments: [
            { tick: 0, segmentType: 0b0001, elements: [] },
            { tick: 480, segmentType: 0b0010, elements: [] },
            { tick: 960, segmentType: 0b0100, elements: [] },
          ],
        },
      ],
      0,
    );
    const ticks = Array.from(iterateMeasureSegments(allMeasures[0] as Measure, 0b0011)).map(
      (s) => s.tick,
    );
    expect(ticks).toEqual([0, 480]);
  });
});

describe("iterateStaves", () => {
  it("yields staffIdx 0..nstaves-1", () => {
    const score = { firstMeasure: null, nstaves: 3 } as unknown as Score;
    expect(Array.from(iterateStaves(score))).toEqual([0, 1, 2]);
  });

  it("yields nothing when nstaves is 0", () => {
    const score = { firstMeasure: null, nstaves: 0 } as unknown as Score;
    expect(Array.from(iterateStaves(score))).toEqual([]);
  });
});

describe("iterateMeasures", () => {
  it("yields all measures linked via nextMeasure", () => {
    const { score, allMeasures } = buildScore(
      [
        { no: 0, segments: [] },
        { no: 1, segments: [] },
        { no: 2, segments: [] },
      ],
      0,
    );
    expect(Array.from(iterateMeasures(score))).toEqual(allMeasures);
  });

  it("yields nothing for an empty score", () => {
    const score = { firstMeasure: null } as unknown as Score;
    expect(Array.from(iterateMeasures(score))).toEqual([]);
  });
});

describe("iterateSegments", () => {
  it("yields every segment across measures", () => {
    const { score, allSegments } = buildScore(
      [
        {
          no: 0,
          segments: [
            { tick: 0, segmentType: 1, elements: [] },
            { tick: 480, segmentType: 1, elements: [] },
          ],
        },
        {
          no: 1,
          segments: [{ tick: 960, segmentType: 1, elements: [] }],
        },
      ],
      0,
    );
    expect(Array.from(iterateSegments(score))).toEqual(allSegments);
  });

  it("filters by segmentType bitmask", () => {
    const { score } = buildScore(
      [
        {
          no: 0,
          segments: [
            { tick: 0, segmentType: 0b0001, elements: [] },
            { tick: 480, segmentType: 0b0010, elements: [] },
            { tick: 960, segmentType: 0b0100, elements: [] },
          ],
        },
      ],
      0,
    );
    const ticks = Array.from(iterateSegments(score, 0b0011)).map((s) => s.tick);
    expect(ticks).toEqual([0, 480]);
  });
});

describe("iterateAnnotations", () => {
  it("yields annotations across all segments", () => {
    const a = annotation("A");
    const b = annotation("B");
    const c = annotation("C");
    const { score } = buildScore(
      [
        {
          no: 0,
          segments: [
            { tick: 0, segmentType: 1, annotations: [a, b], elements: [] },
            { tick: 480, segmentType: 1, annotations: [], elements: [] },
          ],
        },
        {
          no: 1,
          segments: [{ tick: 960, segmentType: 1, annotations: [c], elements: [] }],
        },
      ],
      0,
    );
    expect(Array.from(iterateAnnotations(score))).toEqual([a, b, c]);
  });
});

describe("iterateChords / iterateNotes (scope: all)", () => {
  it("walks every track of every segment", () => {
    const c1 = chord([note("n1"), note("n2")]);
    const c2 = chord([note("n3")]);
    const { score } = buildScore(
      [
        {
          no: 0,
          segments: [
            { tick: 0, segmentType: 1, elements: [c1, null] },
            { tick: 480, segmentType: 1, elements: [null, c2] },
          ],
        },
      ],
      2,
    );
    expect(Array.from(iterateChords(score, { scope: "all" }))).toEqual([c1, c2]);
    expect(
      Array.from(iterateNotes(score, { scope: "all" })).map((n) => (n as { label: string }).label),
    ).toEqual(["n1", "n2", "n3"]);
  });
});

describe("iterateChords / iterateNotes (scope: auto)", () => {
  it("walks the whole score when there is no selection", () => {
    const c1 = chord([note("n1")]);
    const { score } = buildScore(
      [{ no: 0, segments: [{ tick: 0, segmentType: 1, elements: [c1] }] }],
      1,
    );
    expect(Array.from(iterateChords(score))).toEqual([c1]);
  });

  it("uses the element selection when present (non-range)", () => {
    const c1 = chord([note("n1")]);
    const n1 = note("n1");
    const selection = {
      isRange: false,
      elements: [c1, n1],
    } as unknown as Selection;
    const { score } = buildScore([], 0, selection);
    expect(Array.from(iterateChords(score))).toEqual([c1]);
    expect(Array.from(iterateNotes(score))).toEqual([n1]);
  });

  it("uses the range selection when present", () => {
    const c1 = chord([note("n1")]);
    const c2 = chord([note("n2")]);
    const c3 = chord([note("n3")]);
    const { score, allSegments } = buildScore(
      [
        {
          no: 0,
          segments: [
            { tick: 0, segmentType: 1, elements: [c1] },
            { tick: 480, segmentType: 1, elements: [c2] },
            { tick: 960, segmentType: 1, elements: [c3] },
          ],
        },
      ],
      1,
    );
    // Set selection range covering only the middle segment.
    const selection = {
      isRange: true,
      elements: [],
      startSegment: allSegments[1],
      endSegment: allSegments[2],
      startStaff: 0,
      endStaff: 1,
    } as unknown as Selection;
    (score as { selection: Selection }).selection = selection;
    expect(Array.from(iterateChords(score))).toEqual([c2]);
    expect(Array.from(iterateNotes(score)).map((n) => (n as { label: string }).label)).toEqual([
      "n2",
    ]);
  });
});

describe("iterateChords / iterateNotes (scope: selection on element selection)", () => {
  it("yields only matching elements from selection.elements", () => {
    const c1 = chord([note("n1")]);
    const n1 = note("n1");
    const selection = {
      isRange: false,
      elements: [c1, n1, annotation("Title")],
    } as unknown as Selection;
    const { score } = buildScore([], 0, selection);

    expect(Array.from(iterateChords(score, { scope: "selection" }))).toEqual([c1]);
    expect(Array.from(iterateNotes(score, { scope: "selection" }))).toEqual([n1]);
  });

  it("yields nothing when selection is null and scope is 'selection'", () => {
    const { score } = buildScore([], 0, null);
    expect(Array.from(iterateChords(score, { scope: "selection" }))).toEqual([]);
    expect(Array.from(iterateNotes(score, { scope: "selection" }))).toEqual([]);
  });
});
