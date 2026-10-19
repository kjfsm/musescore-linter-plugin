import type { Checker, IndexedIR, Issue, TextEvent } from "@musescore-linter/core";
import { CANONICAL, createIssue, eventsOnStaff } from "@musescore-linter/core";

import { eventsForStaff } from "./base/query.js";

// テキスト式の cresc./dim. の後に到達先の強弱記号が現れない箇所を検出する。
// DYNAMIC kind には強弱記号(f/p/mf 等)とテキスト式の cresc./dim. の両方が含まれるため、
// kind ではなく textNorm のパターンで両者を区別する。
const CRESC_WORDS = new Set([
  "cresc.",
  "cresc",
  "crescendo",
  "dim.",
  "dim",
  "diminuendo",
  "decresc.",
  "decresc",
  "decrescendo",
  "dimin.",
]);

function isCrescText(ev: TextEvent): boolean {
  return CRESC_WORDS.has((ev.textNorm ?? "").toLowerCase().trim());
}

export const crescTextResolutionChecker: Checker = {
  id: "cresc-text-resolution",
  name: "cresc./dim. の到達先",
  description: "テキスト式cresc./dim.の到達先ダイナミクス欠落を検出",
  category: "dynamics",
  severity: "info",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];

    const dynamicKind = CANONICAL.elementKinds.DYNAMIC;

    // 後続の到達先候補（cresc 系でない実強弱記号）を tick 付きで集める。
    // 同 staff のものに加え、global scope(-1) の強弱記号も到達先として認める。
    const targetTicks = (staffIdx: number): number[] => {
      return eventsForStaff(ir, staffIdx, dynamicKind)
        .filter((ev) => !isCrescText(ev))
        .map((ev) => ev.tick);
    };

    for (const staff of ir.meta.parts) {
      const resolveTicks = targetTicks(staff.staffIdx);

      for (const ev of eventsOnStaff(ir, staff.staffIdx, dynamicKind)) {
        if (!isCrescText(ev)) continue;
        // 後続(tick がより後ろ)の強弱記号があれば解決済み
        if (resolveTicks.some((t) => t > ev.tick)) continue;

        issues.push(
          createIssue(crescTextResolutionChecker, {
            message: `${staff.partName}: "${ev.textRaw}" の後に到達先の強弱記号がありません（${ev.measure}小節目）`,
            partName: staff.partName,
            staffIdx: staff.staffIdx,
            measure: ev.measure,
            tick: ev.tick,
          }),
        );
      }
    }
    return issues;
  },
};
