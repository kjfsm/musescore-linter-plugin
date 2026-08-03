import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";

import { getCanonical } from "./base/predicates.js";
import { buildPartNameMap, measureAtTick } from "./base/query.js";
import { findRestOnlyEndpoints } from "./base/spannerOnRest.js";

export const hairpinOnRestChecker: Checker = {
  id: "hairpin-on-rest",
  name: "休符上のヘアピン端点",
  description: "ヘアピンの端点が休符上にある箇所を検出",
  category: "dynamics",
  // slur-on-rest（warning）とわざと非対称。休符に掛かるスラーは記譜として明確な誤りだが、
  // ヘアピンの端点が休符上に来るのは実務では珍しくないため info に留める。
  // 元は 1 つの checker で severity を共有しており、バッジと実際の issue が食い違って
  // いたので分割した（2dfcbec）。揃えないこと。
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
