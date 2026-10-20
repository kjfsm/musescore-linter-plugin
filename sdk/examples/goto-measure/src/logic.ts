import { jumpToMeasure } from "@kjfsm/musescore-plugin-sdk-helpers";
import type { Score } from "@kjfsm/musescore-plugin-sdk-types";

const TARGET_MEASURE_INDEX = 7;

export function run(score: Score | null): void {
  if (!score) {
    console.log("no score is open");
    return;
  }
  const ok = jumpToMeasure(score, TARGET_MEASURE_INDEX);
  console.log(
    ok
      ? `jumped to measure index ${TARGET_MEASURE_INDEX}`
      : `score has no measure with index ${TARGET_MEASURE_INDEX}`,
  );
}
