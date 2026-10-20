import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { createSnapshotWriter } from "../src/snapshot.js";

const score = buildScore({
  parts: [{ name: "Vn", staffCount: 2 }, { name: "Va" }],
  measures: [{}, {}],
  chords: [
    { staff: 0, tick: 0 },
    { staff: 0, tick: 480, voice: 1 },
    { staff: 2, tick: 1920 },
  ],
  rests: [{ staff: 1, tick: 0 }],
  annotations: [{ staff: 0, text: "pizz." }, { text: "Allegro" }],
  barlines: [{ staff: 0, tick: 3840, kind: "final" }],
  slurs: [{ startTick: 0, endTick: 480 }],
});

function writeAll(max: number): string {
  const writer = createSnapshotWriter(score);
  let steps = 0;
  while (!writer.step(max)) steps++;
  expect(steps).toBeGreaterThan(0);
  expect(writer.done).toBe(writer.total);
  return writer.text();
}

describe("createSnapshotWriter", () => {
  it("読み戻すと Score と同じ値になる", () => {
    expect(JSON.parse(writeAll(3))).toEqual(score);
  });

  it("区切り方によらず同じ文字列になる", () => {
    expect(writeAll(1)).toBe(writeAll(5));
  });

  it("空の楽譜でも JSON として読める", () => {
    const writer = createSnapshotWriter(buildScore({ parts: [] }));
    writer.step(Number.MAX_SAFE_INTEGER);
    expect(JSON.parse(writer.text())).toEqual(buildScore({ parts: [] }));
  });

  it("音符は 1 行に 1 つ", () => {
    const lines = writeAll(10).split("\n");
    expect(lines.filter((l) => l.includes('"type":"chord"'))).toHaveLength(3);
  });
});
