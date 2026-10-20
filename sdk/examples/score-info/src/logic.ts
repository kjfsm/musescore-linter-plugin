import {
  getMetaTag,
  iterateChords,
  iterateMeasures,
  iterateNotes,
} from "@kjfsm/musescore-plugin-sdk-helpers";
import type { Score } from "@kjfsm/musescore-plugin-sdk-types";

export interface ScoreInfo {
  title: string | undefined;
  composer: string | undefined;
  measures: number;
  chords: number;
  notes: number;
}

export function collectInfo(score: Score): ScoreInfo {
  let measures = 0;
  for (const _ of iterateMeasures(score)) measures++;
  let chords = 0;
  for (const _ of iterateChords(score, { scope: "all" })) chords++;
  let notes = 0;
  for (const _ of iterateNotes(score, { scope: "all" })) notes++;
  return {
    title: getMetaTag(score, "workTitle"),
    composer: getMetaTag(score, "composer"),
    measures,
    chords,
    notes,
  };
}

export function run(score: Score | null): void {
  if (!score) {
    console.log("no score is open");
    return;
  }
  const info = collectInfo(score);
  console.log(`title: ${info.title ?? "(untitled)"}`);
  console.log(`composer: ${info.composer ?? "(unknown)"}`);
  console.log(`measures: ${info.measures}`);
  console.log(`chords: ${info.chords}`);
  console.log(`notes: ${info.notes}`);
}
