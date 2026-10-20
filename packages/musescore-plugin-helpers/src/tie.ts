import type { ScoreElement, Tie } from "@score-linter/musescore-api-types";

/**
 * A MuseScore tie connects two noteheads of the **same pitch**. Narrow with `isTie`
 * to read `startNote` / `endNote` (e.g. via `getTiePitches`).
 */
export function isTie(el: ScoreElement | null | undefined): el is Tie {
  return el?.name === "Tie";
}
