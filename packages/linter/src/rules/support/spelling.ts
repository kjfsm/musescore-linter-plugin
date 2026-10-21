import type { Chord, Score } from "@score-linter/score-model";
import { stableSortBy } from "@score-linter/score-model";

export interface Placed {
  chord: Chord;
  staff: number;
  voice: number;
}

export function chordsInOrder(score: Score, staves: readonly number[]): Placed[] {
  const placed: Placed[] = [];
  for (const staff of staves) {
    score.staves[staff]?.voices.forEach((v, voice) => {
      for (const e of v.events) if (e.type === "chord") placed.push({ chord: e, staff, voice });
    });
  }
  return stableSortBy(
    placed,
    (a, b) =>
      a.chord.measure - b.chord.measure ||
      a.chord.tick - b.chord.tick ||
      a.staff - b.staff ||
      a.voice - b.voice,
  );
}

export const keyLabel = (fifths: number): string =>
  fifths === 0 ? "調号なし" : fifths > 0 ? `シャープ ${fifths} つ` : `フラット ${-fifths} つ`;
