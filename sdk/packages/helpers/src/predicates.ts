import type { Chord, ChordRest, Note, ScoreElement } from "@kjfsm/musescore-plugin-sdk-types";

export function isChord(el: ScoreElement | null | undefined): el is Chord {
  return el?.name === "Chord";
}

export function isNote(el: ScoreElement | null | undefined): el is Note {
  return el?.name === "Note";
}

export function isRest(el: ScoreElement | null | undefined): el is ChordRest {
  return el?.name === "Rest";
}
