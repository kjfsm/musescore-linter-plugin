import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";

import { getCanonical } from "./base/predicates.js";
import { buildPartNameMap, measureAtTick } from "./base/query.js";
import { findRestOnlyEndpoints } from "./base/spannerOnRest.js";

export const hairpinOnRestChecker: Checker = {
  id: "hairpin-on-rest",
  name: "休符上のヘアピン端点",
  description:
    "ヘアピン(cresc./dim.)の開始/終了端点が休符上にある箇所を検出（同 tick に音符があれば許容）",
  category: "notation",
  severity: "info",
  defaultEnabled: true,
  run(ir: LintIR): Issue[] {
    const canonical = getCanonical(ir);
    if (!canonical) return [];

    const partsByStaff = buildPartNameMap(ir);
    const hits = findRestOnlyEndpoints(
      ir,
      ir.meta?.hairpins ?? [],
      "hairpin",
      canonical.elementKinds.REST,
      canonical.elementKinds.CHORD,
    );

    return hits.map((hit) => {
      const partName = partsByStaff.get(hit.staffIdx) ?? "";
      const measure = measureAtTick(ir, hit.tick);
      return createIssue(hairpinOnRestChecker, {
        message: `${partName}: ヘアピンの${hit.endpoint}端点が休符上にあります（${measure}小節目）`,
        partName,
        staffIdx: hit.staffIdx,
        measure,
        tick: hit.tick,
        detail: hit.detail,
      });
    });
  },
};
