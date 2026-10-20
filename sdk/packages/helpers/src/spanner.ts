import type { ScoreElement, Spanner } from "@kjfsm/musescore-plugin-sdk-types";

export interface SpannerRange {
  startTick: number;
  endTick: number;
}

/**
 * Returns the tick range [startTick, endTick) of any spanner (hairpin, slur, ...),
 * reading `spannerTick` (start) and `spannerTicks` (duration). Null fractions count as 0.
 */
export function getSpannerRange(spanner: Spanner): SpannerRange {
  const start = spanner.spannerTick?.ticks ?? 0;
  const dur = spanner.spannerTicks?.ticks ?? 0;
  return { startTick: start, endTick: start + dur };
}

/**
 * A MuseScore slur is a `Spanner`. Narrow with `isSlur` to read `spannerTick`/`spannerTicks`
 * (e.g. via `getSpannerRange`).
 */
export function isSlur(el: ScoreElement | null | undefined): el is Spanner {
  return el?.name === "Slur";
}
