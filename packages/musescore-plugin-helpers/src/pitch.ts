import type { Chord } from "@score-linter/musescore-api-types";

/**
 * MIDI pitch numbers (0-127) of all notes in a chord, in storage order.
 * Notes whose `pitch` is not a number (unpitched / malformed) are skipped.
 */
export function getNotePitches(chord: Chord): number[] {
  return (chord.notes ?? [])
    .map((note) => note.pitch)
    .filter((pitch): pitch is number => typeof pitch === "number");
}
