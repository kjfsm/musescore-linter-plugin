import type { Note, Score, Selection } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it, vi } from "vitest";
import { paintNotes, run } from "./logic.js";

function makeNote(): Note & { color: string } {
  return { name: "Note", color: "" } as unknown as Note & { color: string };
}

function makeScoreWithSelectedNotes(notes: Note[]): Score {
  const startCmd = vi.fn();
  const endCmd = vi.fn();
  const selection = {
    isRange: false,
    elements: notes,
  } as unknown as Selection;
  return {
    startCmd,
    endCmd,
    firstMeasure: null,
    ntracks: 0,
    selection,
  } as unknown as Score;
}

describe("paintNotes", () => {
  it("assigns the given color to every iterated note and returns the count", () => {
    const n1 = makeNote();
    const n2 = makeNote();
    const score = makeScoreWithSelectedNotes([n1, n2]);
    const count = paintNotes(score, "#ff0000");
    expect(count).toBe(2);
    expect(n1.color).toBe("#ff0000");
    expect(n2.color).toBe("#ff0000");
  });
});

describe("run", () => {
  it("logs and exits early when score is null", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    run(null);
    expect(log).toHaveBeenCalledWith("no score is open");
    log.mockRestore();
  });

  it("wraps the work in startCmd/endCmd and reports the count", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const n = makeNote();
    const score = makeScoreWithSelectedNotes([n]);
    run(score);
    expect(score.startCmd as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "Color selected notes red",
    );
    expect(score.endCmd as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(false);
    expect(n.color).toBe("#ff0000");
    expect(log).toHaveBeenCalledWith("colored 1 note(s) red");
    log.mockRestore();
  });
});
