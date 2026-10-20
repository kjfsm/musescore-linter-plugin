import type { Score } from "./generated/plugin-api.js";

declare global {
  const curScore: Score | null;
  const Qt: {
    quit(): void;
  };
}
