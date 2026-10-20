import type { Chord } from "@kjfsm/musescore-plugin-sdk-types";

/**
 * Returns the names of the articulations attached to a chord (e.g. "Staccato", "Accent"),
 * using MuseScore's `subtypeName()`. Empty names are dropped. Returns `[]` for a chord with
 * no articulations.
 */
export function getArticulationNames(chord: Chord): string[] {
  return (chord.articulations ?? [])
    .map((articulation) => articulation.subtypeName())
    .filter((name) => name.length > 0);
}
