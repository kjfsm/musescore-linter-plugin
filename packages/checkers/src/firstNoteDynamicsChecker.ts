import type { Checker, IndexedIR, Issue } from "@score-linter/core";
import { CANONICAL, createIssue } from "@score-linter/core";

import { eventsForStaff } from "./base/query.js";

export const firstNoteDynamicsChecker: Checker = {
  id: "first-note-dynamics",
  name: "各パート冒頭ダイナミクス",
  description: "各パート1音目のダイナミクス欠落を検出",
  category: "dynamics",
  severity: "error",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];
    if (!ir.meta.parts) return issues;

    const { firstChordByStaff } = ir.derived;
    const dynamicKind = CANONICAL.elementKinds.DYNAMIC;

    for (const staff of ir.meta.parts) {
      const firstChord = firstChordByStaff[staff.staffIdx];
      if (!firstChord) continue;

      // 譜表に載ったダイナミクスと、global scope（全パート共通）のダイナミクスの
      // 両方を見る。MuseScore 経路は後者に置くが、MusicXML 経路には相当する表現が
      // 無く譜表に載る。
      const hasDynamics = eventsForStaff(ir, staff.staffIdx, dynamicKind).some(
        (ev) => ev.tick === firstChord.tick,
      );

      if (!hasDynamics) {
        issues.push(
          createIssue(firstNoteDynamicsChecker, {
            message: `${staff.partName}: 1音目にダイナミクスがありません`,
            partName: staff.partName,
            staffIdx: staff.staffIdx,
            measure: firstChord.measure,
            tick: firstChord.tick,
          }),
        );
      }
    }
    return issues;
  },
};
