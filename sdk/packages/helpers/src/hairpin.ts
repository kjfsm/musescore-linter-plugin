import type { HairpinType, ScoreElement, Spanner } from "@kjfsm/musescore-plugin-sdk-types";
import { getSpannerRange, type SpannerRange } from "./spanner.js";

/**
 * A MuseScore hairpin (crescendo/diminuendo). Extends Spanner so that spannerTick and
 * spannerTicks are accessible after narrowing with isHairpin.
 */
export interface Hairpin extends Spanner {
  hairpinType: HairpinType;
}

export function isHairpin(el: ScoreElement | null | undefined): el is Hairpin {
  return el?.name === "Hairpin";
}

/** Alias of {@link SpannerRange}. */
export type HairpinRange = SpannerRange;

/** Returns the tick range [startTick, endTick) of a hairpin. */
export function getHairpinRange(el: Hairpin): SpannerRange {
  return getSpannerRange(el);
}
