import type { Checker, IndexedIR, Issue } from "@musescore-linter/core";
import { CANONICAL, createIssue, eventsOnStaff } from "@musescore-linter/core";

export const finalBarlineChecker: Checker = {
  id: "final-barline",
  name: "終止線の確認",
  description: "曲末の最終小節線が終止線でない箇所を検出",
  category: "notation",
  severity: "info",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];
    if (!ir.meta.parts.length) return issues;

    const [staff] = ir.meta.parts;
    if (!staff) return issues;
    const bars = eventsOnStaff(ir, staff.staffIdx, CANONICAL.elementKinds.BAR_LINE);
    const [firstBar] = bars;
    if (!firstBar) return issues;

    const lastBarline = bars.reduce((best, ev) => (ev.tick > best.tick ? ev : best), firstBar);

    if (lastBarline.barlineKind === CANONICAL.barlineKinds.FINAL) {
      return issues;
    }

    issues.push(
      createIssue(finalBarlineChecker, {
        message: `曲末（${lastBarline.measure}小節目）が終止線になっていません`,
        partName: staff.partName,
        staffIdx: staff.staffIdx,
        measure: lastBarline.measure,
        tick: lastBarline.tick,
      }),
    );
    return issues;
  },
};
