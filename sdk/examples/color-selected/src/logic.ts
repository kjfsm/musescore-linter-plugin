import { iterateNotes, withCmd } from "@kjfsm/musescore-plugin-sdk-helpers";
import type { Score } from "@kjfsm/musescore-plugin-sdk-types";

const RED = "#ff0000";

export function paintNotes(score: Score, color: string): number {
  let count = 0;
  for (const note of iterateNotes(score)) {
    note.color = color;
    count++;
  }
  return count;
}

export function run(score: Score | null): void {
  if (!score) {
    console.log("no score is open");
    return;
  }
  const count = withCmd(score, "Color selected notes red", () => paintNotes(score, RED));
  console.log(`colored ${count} note(s) red`);
}
