import type { Score } from "@kjfsm/musescore-plugin-sdk-types";

export function getMetaTag(score: Score, tag: string): string | undefined {
  const value = score.metaTag(tag);
  return value === "" ? undefined : value;
}
