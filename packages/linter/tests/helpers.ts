import type { AnnotationSpec, ChordSpec, Score, ScoreSpec } from "@score-linter/score-model";
import { buildScore } from "@score-linter/score-model";

import { createLinter } from "../src/engine.js";
import { builtinRules } from "../src/rules/index.js";
import type { Issue, Rule } from "../src/types.js";

/** ルールを 1 つだけ有効にしたリンターで lint する。オプションは生の値で渡す。 */
export function runRule(rule: Rule, score: Score, options?: unknown): Issue[] {
  return createLinter([rule]).lint(score, { options: { [rule.id]: options } }).issues;
}

export function runAll(score: Score, enabled: Record<string, boolean> = {}): Issue[] {
  return createLinter(builtinRules).lint(score, { enabled }).issues;
}

/**
 * どの組み込みルールにも引っかからない最小の楽譜に、要素を足したもの。
 * 冒頭にテンポ表記があり、各パートの 1 音目に強弱記号が付いている。
 */
export function cleanScore(
  extra: Omit<ScoreSpec, "parts"> = {},
  partNames: string[] = ["Vn1", "Vn2"],
): Score {
  const parts = partNames.map((name, i) => ({ id: `P${i + 1}`, name }));
  const chords: ChordSpec[] = parts.map((_, staff) => ({ staff, tick: 0 }));
  const annotations: AnnotationSpec[] = [
    { staff: 0, tick: 0, text: "Allegro", kind: "tempo", bpm: 120 },
    ...parts.map((_, staff) => ({ staff, tick: 0, text: "f", kind: "dynamic" as const })),
  ];
  return buildScore({
    ...extra,
    parts,
    chords: [...chords, ...(extra.chords ?? [])],
    annotations: [...annotations, ...(extra.annotations ?? [])],
  });
}

/** 弦楽五重奏（Vn1/Vn2/Va/Vc/Cb）の {@link cleanScore}。 */
export function quintetScore(extra: Omit<ScoreSpec, "parts"> = {}): Score {
  return cleanScore(extra, ["Vn1", "Vn2", "Va", "Vc", "Cb"]);
}
