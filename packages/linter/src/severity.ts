import type { Severity } from "./types.ts";

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** 重いほうが前に来る比較。`a` が `b` より重ければ負。 */
export function compareSeverity(a: Severity, b: Severity): number {
  return RANK[a] - RANK[b];
}
