import type { Score, Technique } from "@score-linter/score-model";
import { annotationsOn, normalizeText, stableSortBy } from "@score-linter/score-model";

import { defineRule } from "../../engine.ts";
import type { Rule, RuleExamples, Severity } from "../../types.ts";
import { techniqueOf } from "./common.ts";

const MESSAGES = {
  onDuplicate:
    "{on} が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
  offDuplicate:
    "{off} が既に指示済みの状態で再度指示されています（前回: {{measure:previousMeasure}}）",
  unclosed: "{on} のまま曲が終了しています（{off} が必要かもしれません）",
};

type TechniquePairMessageId = keyof typeof MESSAGES;

interface TechniquePairConfig {
  id: string;
  name: string;
  description: string;
  docs: string;
  on: readonly Technique[];
  off: readonly Technique[];
  /** 文面に出す表記。on・off が複数の奏法を含んでも、代表の 1 つを書く。 */
  onLabel: string;
  offLabel: string;
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
    messages: MESSAGES,
    examples: config.examples,
    run({ score, report }) {
      for (const part of score.parts) {
        const staff = part.staves[0];
        if (staff === undefined) continue;
        let isOn = false;
        let hasBeenOn = false;
        let last: Switch | null = null;

        const labels = { on: config.onLabel, off: config.offLabel };
        const reportDuplicate = (
          s: Switch,
          previous: Switch,
          messageId: "onDuplicate" | "offDuplicate",
          severity?: Severity,
        ) => {
          report({
            at: { staff, measure: s.measure, tick: s.tick },
            messageId,
            data: labels,
            detail: { previousMeasure: previous.measure },
            ...(severity ? { severity } : {}),
          });
        };

        for (const s of switchesOf(score, part.staves)) {
          if (config.on.includes(s.technique)) {
            if (isOn && last) reportDuplicate(s, last, "onDuplicate", config.onDuplicateSeverity);
            isOn = true;
            hasBeenOn = true;
            last = s;
          } else if (config.off.includes(s.technique)) {
            if (!isOn && hasBeenOn && last) reportDuplicate(s, last, "offDuplicate");
            isOn = false;
            last = s;
          }
        }

        if (isOn && last) {
          report({
            at: { staff, measure: last.measure, tick: last.tick },
            messageId: "unclosed",
            data: labels,
          });
        }
      }
    },
  });
}
