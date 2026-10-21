import type { Score } from "./generated/plugin-api.ts";

declare global {
  const curScore: Score | null;
  const Qt: {
    quit(): void;
  };
}
