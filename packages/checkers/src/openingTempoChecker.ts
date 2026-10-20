import type { Checker, IndexedIR, Issue } from "@score-linter/core";
import { CANONICAL, createIssue } from "@score-linter/core";

import { eventsForStaff } from "./base/query.js";

export const openingTempoChecker: Checker = {
  id: "opening-tempo",
  name: "冒頭テンポ表記",
  description: "曲頭のテンポ表記の欠落を検出",
  category: "tempo",
  severity: "error",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];
    if (!ir.meta.parts.length) return issues;

    const [staff] = ir.meta.parts;
    if (!staff) return issues;
    const firstMusicTick = ir.meta.firstMusicTickByStaff[staff.staffIdx] ?? null;
    if (firstMusicTick === null) return issues;

    // 譜表に載ったテンポ表記と、global scope（全パート共通）のテンポ表記の両方を見る。
    // MuseScore 経路は後者に置き、MusicXML 経路は前者に置く。
    const tempoKind = CANONICAL.elementKinds.TEMPO_TEXT;
    const tempos = eventsForStaff(ir, staff.staffIdx, tempoKind);
    if (tempos.some((ev) => ev.tick <= firstMusicTick)) return issues;

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
