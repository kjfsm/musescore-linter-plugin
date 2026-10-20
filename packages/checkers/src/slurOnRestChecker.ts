import type { Checker, Issue, LintIR } from "@score-linter/core";
import { CANONICAL, createIssue } from "@score-linter/core";

import { buildPartNameMap, measureAtTick } from "./base/query.js";
import { findRestOnlyEndpoints } from "./base/spannerOnRest.js";

export const slurOnRestChecker: Checker = {
  id: "slur-on-rest",
  name: "休符上のスラー端点",
  description: "スラーの端点が休符上にある箇所を検出",
  category: "slur-tie",
  severity: "warning",
  defaultEnabled: true,
  run(ir: LintIR): Issue[] {
    const partsByStaff = buildPartNameMap(ir);
    const hits = findRestOnlyEndpoints(
      ir,
      ir.meta.slurs,
      "slur",
      CANONICAL.elementKinds.REST,
      CANONICAL.elementKinds.CHORD,
    );

    return hits.map((hit) => {
      const partName = partsByStaff.get(hit.staffIdx) ?? "";
      const measure = measureAtTick(ir, hit.tick);
      return createIssue(slurOnRestChecker, {
        message: `${partName}: スラーの${hit.endpoint}端点が休符上にあります（${measure}小節目）`,
        partName,
        staffIdx: hit.staffIdx,
        measure,
        tick: hit.tick,
        detail: hit.detail,
      });
    });
  },
};
