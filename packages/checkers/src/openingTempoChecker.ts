import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";

import { getCanonical } from "./base/predicates.js";
import { eventIdsForStaff } from "./base/query.js";

export const openingTempoChecker: Checker = {
  id: "opening-tempo",
  name: "冒頭テンポ表記",
  description: "曲頭のテンポ表記の欠落を検出",
  category: "tempo",
  severity: "error",
  defaultEnabled: true,
  run(ir: LintIR): Issue[] {
    const issues: Issue[] = [];
    if (!ir.meta?.parts?.length) return issues;

    const canonical = getCanonical(ir);
    if (!canonical) return issues;

    const staff = ir.meta.parts[0];
    const firstMusicTick = ir.meta.firstMusicTickByStaff[staff.staffIdx] ?? null;
    if (firstMusicTick === null) return issues;

    // 譜表に載ったテンポ表記と、global scope（全パート共通）のテンポ表記の両方を見る。
    // MuseScore 経路は後者に置き、MusicXML 経路は前者に置く。
    const tempoIds = eventIdsForStaff(ir, staff.staffIdx, canonical.elementKinds.TEMPO_TEXT);
    for (const id of tempoIds) {
      if (ir.events[id].tick <= firstMusicTick) return issues;
    }

    issues.push(
      createIssue(openingTempoChecker, {
        message: "冒頭にテンポ表記がありません",
        partName: staff.partName,
        staffIdx: 0,
        measure: 1,
        tick: firstMusicTick,
      }),
    );
    return issues;
  },
};
