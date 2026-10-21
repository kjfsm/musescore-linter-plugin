import type { Score, Technique } from "@score-linter/score-model";
import { annotationsOn, normalizeText, stableSortBy } from "@score-linter/score-model";

import { defineRule } from "../../engine.ts";
import type { Rule, RuleExamples, Severity } from "../../types.ts";
import { techniqueOf } from "./common.ts";

export type TechniquePairMessageId = "onDuplicate" | "offDuplicate" | "unclosed";

interface TechniquePairConfig {
  id: string;
  name: string;
  description: string;
  docs: string;
  on: readonly Technique[];
  off: readonly Technique[];
  messages: Readonly<Record<TechniquePairMessageId, string>>;
  examples: RuleExamples;
  /** on のままさらに on が来たときの severity。省略すると warning。 */
  onDuplicateSeverity?: Severity;
}

interface Switch {
  technique: Technique;
  text: string;
  tick: number;
  measure: number;
  staff: number;
}

/**
 * パートの奏法の切り替えを時間順に並べる。同じパートの複数の譜表に同じ指示が書かれて
 * いても 1 回と数える。
 */
function switchesOf(score: Score, staves: readonly number[]): Switch[] {
  const all: Switch[] = [];
  for (const staff of staves) {
    for (const a of annotationsOn(score, staff)) {
      const technique = techniqueOf(a);
      if (technique) {
        all.push({
          technique,
          text: normalizeText(a.text),
          tick: a.tick,
          measure: a.measure,
          staff,
        });
      }
    }
  }
  const sorted = stableSortBy(
    all,
    (a, b) =>
      a.measure - b.measure ||
      a.tick - b.tick ||
      (a.text < b.text ? -1 : a.text > b.text ? 1 : 0) ||
      a.staff - b.staff,
  );
  const seen = new Set<string>();
  return sorted.filter((s) => {
    const key = `${s.tick}|${s.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function techniquePair(
  config: TechniquePairConfig,
): Rule<Record<never, never>, TechniquePairMessageId> {
  return defineRule({
    id: config.id,
    meta: {
      name: config.name,
      description: config.description,
      category: "articulation",
      severity: "warning",
      tier: "recommended",
      docs: config.docs,
    },
    options: {},
    messages: config.messages,
    examples: config.examples,
    run({ score, report }) {
      for (const part of score.parts) {
        const staff = part.staves[0];
        if (staff === undefined) continue;
        let isOn = false;
        let hasBeenOn = false;
        let last: Switch | null = null;

        const reportDuplicate = (
          s: Switch,
          messageId: "onDuplicate" | "offDuplicate",
          severity?: Severity,
        ) => {
          const previousMeasure = last?.measure ?? null;
          report({
            at: { staff, measure: s.measure, tick: s.tick },
            messageId,
            detail: { previousMeasure },
            ...(severity ? { severity } : {}),
          });
        };

        for (const s of switchesOf(score, part.staves)) {
          if (config.on.includes(s.technique)) {
            if (isOn) reportDuplicate(s, "onDuplicate", config.onDuplicateSeverity);
            isOn = true;
            hasBeenOn = true;
            last = s;
          } else if (config.off.includes(s.technique)) {
            if (!isOn && hasBeenOn) reportDuplicate(s, "offDuplicate");
            isOn = false;
            last = s;
          }
        }

        if (isOn && last) {
          report({
            at: { staff, measure: last.measure, tick: last.tick },
            messageId: "unclosed",
          });
        }
      }
    },
  });
}
