import type { Score } from "@kjfsm/musescore-plugin-sdk-types";

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
