import type { Score } from "@musescore-linter/musescore-api-types";

export function withCmd<T>(score: Score, actionName: string, fn: () => T): T {
  score.startCmd(actionName);
  try {
    const result = fn();
    score.endCmd(false);
    return result;
  } catch (err) {
    score.endCmd(true);
    throw err;
  }
}
