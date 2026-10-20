import type { Checker, IndexedIR, Issue, TextEvent } from "@score-linter/core";
import { CANONICAL, createIssue, eventsOnStaff } from "@score-linter/core";

// sf・rf はアクセント的に連続して使われることが多いため、重複検出の対象から除外する。
const CONSECUTIVE_ALLOWED = new Set(["sf", "rf"]);

// subtype では比べない。MuseScore はテキスト中で最初に見つかった強弱記号を subtype にするので
// 「f」と「più f」が同じ F になり、強弱記号を含まない文字はすべて OTHER に揃う
// （v4.7.3 editing/textedit.cpp の endEdit → Dynamic::parseDynamicText）。
function sameDynamic(a: TextEvent, b: TextEvent): boolean {
  return a.textNorm !== "" && a.textNorm === b.textNorm;
}

export const duplicateDynamicsChecker: Checker = {
  id: "duplicate-dynamics",
  name: "重複ダイナミクス",
  description: "同じ強弱記号が変化なく連続する箇所を検出",
  category: "dynamics",
  severity: "info",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];

    const parts = ir.meta.parts;
    for (const part of parts) {
      const dynEvents = eventsOnStaff(ir, part.staffIdx, CANONICAL.elementKinds.DYNAMIC).sort(
        (a, b) => a.tick - b.tick,
      );

      const hairpins = ir.meta.hairpins.filter((h) => h.staffIdx === part.staffIdx);

      let prev: TextEvent | null = null;
      for (const ev of dynEvents) {
        if (prev !== null && sameDynamic(prev, ev) && !CONSECUTIVE_ALLOWED.has(ev.textNorm)) {
          const prevTick = prev.tick;
          const hasHairpinBetween = hairpins.some(
            (h) => h.startTick >= prevTick && h.startTick < ev.tick,
          );
          if (!hasHairpinBetween) {
            const label = ev.textRaw || ev.textNorm || "(同一)";
            issues.push(
              createIssue(duplicateDynamicsChecker, {
                message: `${part.partName}: ${label} が変化なく連続しています（${ev.measure}小節目、前回: ${prev.measure}小節目）`,
                partName: part.partName,
                staffIdx: part.staffIdx,
                measure: ev.measure,
                tick: ev.tick,
                detail: { previousMeasure: prev.measure },
              }),
            );
          }
        }
        prev = ev;
      }
    }
    return issues;
  },
};
