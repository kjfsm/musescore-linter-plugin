import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";

import { getCanonical, isDynamicMark } from "./base/predicates.js";
import { eventIdsForStaff } from "./base/query.js";

export const firstNoteDynamicsChecker: Checker = {
  id: "first-note-dynamics",
  name: "各パート冒頭ダイナミクス",
  description: "各パート1音目のダイナミクス欠落を検出",
  category: "dynamics",
  severity: "error",
  defaultEnabled: true,
  run(ir: LintIR): Issue[] {
    const issues: Issue[] = [];
    if (!ir.meta?.parts) return issues;

    const canonical = getCanonical(ir);
    if (!canonical) return issues;

    const firstChordByStaff = ir.derived?.firstChordByStaff ?? {};

    for (const staff of ir.meta.parts) {
      const firstChord = firstChordByStaff[staff.staffIdx];
      if (!firstChord) continue;

      let hasDynamics = false;

      // staff-scoped events at firstChord.tick
      const tickIds = ir.index.byTick[String(firstChord.tick)] ?? [];
      for (const id of tickIds) {
        const tev = ir.events[id];
        if (tev.staffIdx !== staff.staffIdx) continue;
        if (isDynamicMark(tev, ir)) {
          hasDynamics = true;
          break;
        }
      }

      // global scope（全パート共通）のダイナミクスも認める。MuseScore 経路は
      // そちらに置くが、MusicXML 経路には相当する表現が無く譜表に載る。
      if (!hasDynamics) {
        const dynamicIds = eventIdsForStaff(ir, staff.staffIdx, canonical.elementKinds.DYNAMIC);
        hasDynamics = dynamicIds.some((id) => ir.events[id].tick === firstChord.tick);
      }

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
