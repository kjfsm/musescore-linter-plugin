import type { Checker, IndexedIR, Issue } from "@musescore-linter/core";
import { CANONICAL, createIssue, eventsOfKind } from "@musescore-linter/core";

import { buildPartNameMap } from "./base/query.js";

export const tempoWithoutBpmChecker: Checker = {
  id: "tempo-without-bpm",
  name: "BPM 値なしテンポ",
  description: "BPM値のないテンポ表記を検出",
  category: "tempo",
  severity: "warning",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];

    const partsByStaff = buildPartNameMap(ir);

    for (const ev of eventsOfKind(ir, CANONICAL.elementKinds.TEMPO_TEXT)) {
      // null / undefined だけでなく NaN や 0 以下も「BPM なし」として扱う。
      // 入力ソースが壊れた値を入れてきても検出漏れにならないようにするため。
      if (typeof ev.tempo === "number" && Number.isFinite(ev.tempo) && ev.tempo > 0) continue;

      const partName = partsByStaff.get(ev.staffIdx) ?? "";
      const label = ev.textRaw || ev.textNorm || "(無題)";
      issues.push(
        createIssue(tempoWithoutBpmChecker, {
          message: `テンポ表記 "${label}" に BPM 値が設定されていません（${ev.measure}小節目）`,
          partName,
          staffIdx: ev.staffIdx,
          measure: ev.measure,
          tick: ev.tick,
        }),
      );
    }
    return issues;
  },
};
