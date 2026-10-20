import type { ScoreElement, Tie } from "@kjfsm/musescore-plugin-sdk-types";

/**
 * A MuseScore tie connects two noteheads of the **same pitch**. Narrow with `isTie`
 * to read `startNote` / `endNote` (e.g. via `getTiePitches`).
 */
export function isTie(el: ScoreElement | null | undefined): el is Tie {
  return el?.name === "Tie";
}

export interface TiePitches {
  startPitch: number;
  endPitch: number;
}

/**
 * Returns the MIDI pitches of a tie's two endpoints, or `null` if either endpoint
 * note is missing or unpitched. A correctly notated tie has `startPitch === endPitch`.
 */
export function getTiePitches(tie: Tie): TiePitches | null {
  const startPitch = tie.startNote?.pitch;
  const endPitch = tie.endNote?.pitch;
  if (typeof startPitch !== "number" || typeof endPitch !== "number") {
    return null;
  }
  return { startPitch, endPitch };
}
