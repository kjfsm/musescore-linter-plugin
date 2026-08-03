import type { Checker, Issue, LintIR, Severity } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";

import { buildPartBuckets, matchesAny, type PartBucketEvent } from "./predicates.js";

/**
 * on/off ペア型 checker（pizz./arco、con sord./senza sord. …）の宣言。
 *
 * この型は以前 core の types.ts にあったが、core 内では一度も使われていなかった。
 * 置き場所が違うせいで onDuplicateSeverity を足すのに
 * TextPairCheckerConfig という別名で拡張し直す必要があり、
 * 「core の LintIR/契約型を checker 側から変更しない」という規約を迂回する形に
 * なっていた。createTextPairChecker の実装都合の型なので checkers 側が持つ。
 */
export interface TextPairCheckerConfig {
  id: string;
  name: string;
  description?: string;
  category?: string;
  severity?: Severity;
  defaultEnabled?: boolean;
  onPatterns: string[];
  offPatterns: string[];
  defaultState: "on" | "off";
  onLabel: string;
  offLabel: string;
  /**
   * 「既に on の状態でさらに on」（solo が連続する等）のときの severity。
   * 省略時は checker 全体の severity を使う。
   */
  onDuplicateSeverity?: Severity;
}

function buildDuplicateIssue(
  checker: Checker,
  partName: string,
  staffIdx: number,
  ev: PartBucketEvent,
  label: string,
  lastSwitchEvent: PartBucketEvent | null,
  severity?: Severity,
): Issue {
  const previousMeasure = lastSwitchEvent?.measure ?? null;
  const suffix = previousMeasure !== null ? `（前回: ${previousMeasure}小節目）` : "";
  return createIssue(checker, {
    message: `${partName}: ${label} が既に指示済みの状態で再度指示されています（${ev.measure}小節目）${suffix}`,
    partName,
    staffIdx,
    measure: ev.measure,
    tick: ev.tick,
    detail: { previousMeasure },
    severity,
  });
}

export function createTextPairChecker(config: TextPairCheckerConfig): Checker {
  const checker: Checker = {
    id: config.id,
    name: config.name,
    description: config.description ?? "",
    category: config.category ?? "articulation",
    severity: config.severity ?? "warning",
    defaultEnabled: config.defaultEnabled !== false,
    run(ir: LintIR): Issue[] {
      const issues: Issue[] = [];
      const parts = buildPartBuckets(ir);

      for (const part of parts) {
        let state = config.defaultState;
        let hasEverBeenOn = config.defaultState === "on";
        let lastSwitchEvent: PartBucketEvent | null = null;

        for (const ev of part.events) {
          if (matchesAny(ev.text, config.onPatterns)) {
            if (state === "on") {
              issues.push(
                buildDuplicateIssue(
                  checker,
                  part.partName,
                  part.staffIdx,
                  ev,
                  config.onLabel,
                  lastSwitchEvent,
                  config.onDuplicateSeverity,
                ),
              );
            }
            state = "on";
            hasEverBeenOn = true;
            lastSwitchEvent = ev;
          } else if (matchesAny(ev.text, config.offPatterns)) {
            if (state === "off" && hasEverBeenOn) {
              issues.push(
                buildDuplicateIssue(
                  checker,
                  part.partName,
                  part.staffIdx,
                  ev,
                  config.offLabel,
                  lastSwitchEvent,
                ),
              );
            }
            state = "off";
            lastSwitchEvent = ev;
          }
        }

        if (state === "on" && lastSwitchEvent) {
          issues.push(
            createIssue(checker, {
              message: `${part.partName}: ${config.onLabel} のまま曲が終了しています（${config.offLabel} が必要かもしれません）`,
              partName: part.partName,
              staffIdx: part.staffIdx,
              measure: lastSwitchEvent.measure,
              tick: lastSwitchEvent.tick,
            }),
          );
        }
      }
      return issues;
    },
  };
  return checker;
}
