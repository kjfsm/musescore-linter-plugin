import type { Checker, IndexedIR, Issue } from "@score-linter/core";
import { CANONICAL, createIssue, eventsOnStaff } from "@score-linter/core";

import { TECHNIQUE_TEXT_KINDS } from "./base/predicates.js";

// 休符に付与してはいけない演奏技法テキスト（textNorm の完全一致）
const DISALLOWED_TECHNIQUE_PATTERNS = new Set([
  "pizz.",
  "pizz",
  "pizzicato",
  "arco",
  "con sord.",
  "con sord",
  "con sordino",
  "senza sord.",
  "senza sord",
  "senza sordino",
  "sul tasto",
  "sul pont.",
  "sul ponticello",
  "s.p.",
  "sp.",
  "con legno",
  "col legno",
  "solo",
  "tutti",
  "div.",
  "divisi",
  "unis.",
  "unison",
  "unisono",
  "ord.",
  "ord",
  "ordinario",
]);

export const restAnnotationChecker: Checker = {
  id: "rest-annotation",
  name: "休符アノテーション",
  description: "休符位置の不適切な注記を検出",
  category: "notation",
  severity: "error",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];

    const parts = ir.meta.parts;
    // 以前は SYSTEM_TEXT を見ておらず、MuseScore で SystemText として書いた
    // 「pizz.」を取りこぼしていた。テンポ表記は休符に載っていて当然なので除く。
    const scannedKinds = [...TECHNIQUE_TEXT_KINDS, CANONICAL.elementKinds.DYNAMIC];

    for (const staff of parts) {
      const restTicks = new Set<number>(
        eventsOnStaff(ir, staff.staffIdx, CANONICAL.elementKinds.REST).map((ev) => ev.tick),
      );

      for (const kind of scannedKinds) {
        for (const ev of eventsOnStaff(ir, staff.staffIdx, kind)) {
          if (!restTicks.has(ev.tick)) continue;

          const isDynamic = ev.kind === CANONICAL.elementKinds.DYNAMIC;
          const isDisallowed =
            isDynamic ||
            (TECHNIQUE_TEXT_KINDS.includes(ev.kind) &&
              DISALLOWED_TECHNIQUE_PATTERNS.has(ev.textNorm));

          if (!isDisallowed) continue;

          issues.push(
            createIssue(restAnnotationChecker, {
              message: `${staff.partName}: 休符に不受理の注記 "${ev.textRaw}" が付与されています（${ev.measure}小節目）`,
              partName: staff.partName,
              staffIdx: staff.staffIdx,
              measure: ev.measure,
              tick: ev.tick,
              // 休符へのダイナミクスは音の受け渡し表現として使われることもあるため info に留める。
              severity: isDynamic ? "info" : undefined,
            }),
          );
        }
      }
    }
    return issues;
  },
};
