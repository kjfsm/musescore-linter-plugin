import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";

import { getCanonical } from "./base/predicates.js";
import { buildPartNameMap } from "./base/query.js";

export const tempoWithoutBpmChecker: Checker = {
  id: "tempo-without-bpm",
  name: "BPM 値なしテンポ",
  description: "BPM値のないテンポ表記を検出",
  category: "tempo",
  severity: "warning",
  defaultEnabled: true,
  run(ir: LintIR): Issue[] {
    const issues: Issue[] = [];
    const canonical = getCanonical(ir);
    if (!canonical) return issues;

    const tempoIds = ir.index.byKind[canonical.elementKinds.TEMPO_TEXT] ?? [];
    const partsByStaff = buildPartNameMap(ir);

    for (const id of tempoIds) {
      const ev = ir.events[id];
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
