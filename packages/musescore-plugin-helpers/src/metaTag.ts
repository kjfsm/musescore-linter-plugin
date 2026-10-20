import type { Score } from "@score-linter/musescore-api-types";

export function getMetaTag(score: Score, tag: string): string | undefined {
  const value = score.metaTag(tag);
  return value === "" ? undefined : value;
}
