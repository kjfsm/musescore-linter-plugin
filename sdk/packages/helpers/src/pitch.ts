import type { Chord } from "@kjfsm/musescore-plugin-sdk-types";

/**
 * MIDI pitch numbers (0-127) of all notes in a chord, in storage order.
 * Notes whose `pitch` is not a number (unpitched / malformed) are skipped.
 */
export function getNotePitches(chord: Chord): number[] {
  return (chord.notes ?? [])
    .map((note) => note.pitch)
    .filter((pitch): pitch is number => typeof pitch === "number");
}

export interface NoteSpelling {
  /** MIDI pitch (0-127), or -1 if unavailable. */
  pitch: number;
  /** Tonal pitch class (spelling). C = 14. */
  tpc: number;
  /** Staff line position (encodes letter + octave for the current clef). */
  line: number;
  /** Whether an accidental glyph is shown on this notehead. */
  accidentalShown: boolean;
}

/**
 * Per-note spelling info for a chord: MIDI pitch, TPC (spelling), staff line,
 * and whether an accidental glyph is currently shown. Used to reason about
 * cautionary / courtesy accidentals.
 */
export function getNoteSpellings(chord: Chord): NoteSpelling[] {
  return (chord.notes ?? []).map((note) => ({
    pitch: typeof note.pitch === "number" ? note.pitch : -1,
    tpc: note.tpc,
    line: note.line,
    accidentalShown: note.accidental != null,
  }));
}
