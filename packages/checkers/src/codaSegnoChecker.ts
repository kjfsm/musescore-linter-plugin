import type { Checker, IndexedIR, Issue, LintEvent } from "@musescore-linter/core";
import { createIssue, eventsOfKind } from "@musescore-linter/core";

import { getCanonical, techniqueTextKinds } from "./base/predicates.js";

function collectTextEvents(ir: IndexedIR): LintEvent[] {
  const canonical = getCanonical(ir);
  if (!canonical) return [];

  // 以前は EXPRESSION を見ておらず、MuseScore で Expression 要素として書いた
  // 「Coda」「D.C.」を取りこぼしていた。テンポ表記は反復記号を載せないので除く。
  const kinds = [...techniqueTextKinds(ir), canonical.elementKinds.REHEARSAL_MARK];

  return kinds.flatMap((kind) => eventsOfKind(ir, kind));
}

const DS_RE = /\bd\.?\s*s\.?/;

export const codaSegnoChecker: Checker = {
  id: "coda-segno",
  name: "コーダ/セーニョ整合性",
  description: "D.S./D.C.とSegno/Coda/Fineの対応漏れを検出",
  category: "notation",
  severity: "error",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];
    const textEvents = collectTextEvents(ir);
    if (textEvents.length === 0) return issues;

    const segnoRefs: LintEvent[] = [];
    const segnoMarks: LintEvent[] = [];
    const codaRefs: LintEvent[] = [];
    const codaMarks: LintEvent[] = [];
    const fineRefs: LintEvent[] = [];
    const fineMarks: LintEvent[] = [];

    for (const ev of textEvents) {
      const text = ev.textNorm;
      // D.S. 系（D.S., D.S. al Coda, D.S. al Fine, dal Segno）
      if (DS_RE.test(text) || text.includes("dal segno")) {
        segnoRefs.push(ev);
      }
      // Segno マーク
      if (text === "segno" || text.includes("𝅇") || text === "$") {
        segnoMarks.push(ev);
      }
      // al Coda 参照（D.S./D.C. al Coda）
      if (text.includes("al coda")) {
        codaRefs.push(ev);
      }
      // Coda マーク
      if (text === "coda" || text.includes("𝅌")) {
        codaMarks.push(ev);
      }
      // al Fine 参照（D.C./D.S. al Fine）
      if (text.includes("al fine")) {
        fineRefs.push(ev);
      }
      // Fine マーク（"al fine" を含まない単体 "fine"）
      if ((text === "fine" || text === "fine.") && !text.includes("al fine")) {
        fineMarks.push(ev);
      }
    }

    const segnoRef = segnoRefs[0];
    if (segnoRef && segnoMarks.length === 0) {
      issues.push(
        createIssue(codaSegnoChecker, {
          message: `"${segnoRef.textRaw}" がありますが、対応する Segno マークが見つかりません`,
          partName: "",
          staffIdx: -1,
          measure: segnoRef.measure,
          tick: segnoRef.tick,
        }),
      );
    }

    const codaRef = codaRefs[0];
    if (codaRef && codaMarks.length === 0) {
      issues.push(
        createIssue(codaSegnoChecker, {
          message: `"${codaRef.textRaw}" がありますが、対応する Coda マークが見つかりません`,
          partName: "",
          staffIdx: -1,
          measure: codaRef.measure,
          tick: codaRef.tick,
        }),
      );
    }

    const codaMark = codaMarks[0];
    if (codaMark && codaRefs.length === 0) {
      issues.push(
        createIssue(codaSegnoChecker, {
          message: `Coda マークがありますが、"al Coda" を参照する記号（D.S./D.C. al Coda）が見つかりません`,
          partName: "",
          staffIdx: -1,
          measure: codaMark.measure,
          tick: codaMark.tick,
        }),
      );
    }

    const fineRef = fineRefs[0];
    if (fineRef && fineMarks.length === 0) {
      issues.push(
        createIssue(codaSegnoChecker, {
          message: `"${fineRef.textRaw}" がありますが、対応する Fine マークが見つかりません`,
          partName: "",
          staffIdx: -1,
          measure: fineRef.measure,
          tick: fineRef.tick,
        }),
      );
    }

    return issues;
  },
};
