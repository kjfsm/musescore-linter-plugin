import type {
  EngravingItem,
  Measure,
  Score,
  ScoreElement,
  Segment,
} from "@kjfsm/musescore-plugin-sdk-types";
import { iterateMeasures } from "./traversal.js";

/**
 * Returns the first measure whose `Measure.no` matches `index`.
 *
 * `Measure.no` follows MuseScore's internal numbering. With an anacrusis the
 * first regular bar may be `0`, so check your score conventions before treating
 * `index` as a 1-based bar number.
 */
export function findMeasureByIndex(score: Score, index: number): Measure | null {
  for (const m of iterateMeasures(score)) {
    if (m.no === index) return m;
  }
  return null;
}

/**
 * Returns the segment at the given absolute tick by piggy-backing on a fresh
 * cursor. Useful because `Score.findSegmentAtTick` requires a `FractionWrapper`
 * which is awkward to construct from a numeric tick.
 */
export function findSegmentByTick(score: Score, tick: number): Segment | null {
  const cursor = score.newCursor();
  if (!cursor) return null;
  cursor.rewindToTick(tick);
  return cursor.segment;
}

/**
 * Scrolls the score view to `element`. No-op when `element` is null. The
 * `staffIdx` defaults to `0` to match `Score.showElementInScore`'s required
 * argument.
 */
export function jumpToElement(score: Score, element: ScoreElement | null, staffIdx?: number): void {
  if (!element) return;
  score.showElementInScore(element as EngravingItem, staffIdx ?? 0);
}

/**
 * Finds the measure with `Measure.no === measureIndex` and scrolls to it.
 * Returns `true` on success, `false` when the measure cannot be found.
 */
export function jumpToMeasure(score: Score, measureIndex: number, staffIdx?: number): boolean {
  const m = findMeasureByIndex(score, measureIndex);
  if (!m) return false;
  jumpToElement(score, m, staffIdx);
  return true;
}
