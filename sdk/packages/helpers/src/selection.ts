import type { EngravingItem, Score } from "@kjfsm/musescore-plugin-sdk-types";
import { VOICES_PER_STAFF } from "./tracks.js";

export interface SelectionRange {
  startTick: number;
  endTick: number;
  startTrack: number;
  endTrack: number;
}

export function hasRangeSelection(score: Score): boolean {
  return score.selection?.isRange ?? false;
}

export function getSelectedElements(score: Score): EngravingItem[] {
  return score.selection?.elements ?? [];
}

/**
 * Returns the bounding box of the current range selection as plain numbers,
 * or `null` when there is no range selection.
 *
 * `endTick` is `Number.MAX_SAFE_INTEGER` when the selection extends to the end
 * of the score (i.e. `endSegment` is null). `startTrack` / `endTrack` are
 * derived as `staffIdx * 4` to match MuseScore's convention of 4 voices per staff.
 */
export function getSelectionRange(score: Score): SelectionRange | null {
  const sel = score.selection;
  if (!sel || !sel.isRange) return null;
  const startTick = sel.startSegment?.tick ?? 0;
  const endTick = sel.endSegment?.tick ?? Number.MAX_SAFE_INTEGER;
  return {
    startTick,
    endTick,
    startTrack: sel.startStaff * VOICES_PER_STAFF,
    endTrack: sel.endStaff * VOICES_PER_STAFF,
  };
}
