import type { Annotation, RepeatMark } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { ofKind } from "./support/common.ts";

export const codaSegno = defineRule({
  id: "coda-segno",
  meta: {
    name: "コーダ/セーニョ整合性",
    description: "D.S./D.C.とSegno/Coda/Fineの対応漏れを検出",
    category: "notation",
    severity: "error",
    tier: "recommended",
    docs: "`D.S.`/`D.C.` と `Segno`/`Coda`/`Fine` の対応（参照先マークの欠落）",
  },
  options: {},
  messages: {
    segnoMissing: '"{text}" がありますが、対応する Segno マークが見つかりません',
    codaMissing: '"{text}" がありますが、対応する Coda マークが見つかりません',
    alCodaMissing:
      'Coda マークがありますが、"al Coda" を参照する記号（D.S./D.C. al Coda）が見つかりません',
    fineMissing: '"{text}" がありますが、対応する Fine マークが見つかりません',
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }],
          annotations: [{ tick: 960, measure: 3, text: "D.S." }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }],
          annotations: [
            { tick: 480, measure: 2, text: "Segno" },
            { tick: 960, measure: 3, text: "D.S." },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    // テンポ表記と強弱記号は反復記号を載せない
    const candidates = [
      ...ofKind(score.annotations, "text"),
      ...ofKind(score.annotations, "rehearsal"),
    ];
    const withMark = (mark: RepeatMark): Annotation[] =>
      candidates.filter((a) => a.directives.some((d) => d.type === "repeat" && d.mark === mark));

    const missing = (
      ref: Annotation | undefined,
      targets: Annotation[],
      messageId: "segnoMissing" | "codaMissing" | "alCodaMissing" | "fineMissing",
    ) => {
      if (!ref || targets.length > 0) return;
      report({
        at: { measure: ref.measure, tick: ref.tick },
        messageId,
        data: { text: ref.text },
      });
    };

    const dalSegno = withMark("dal-segno")[0];
    missing(dalSegno, withMark("segno"), "segnoMissing");

    const alCoda = withMark("al-coda");
    const codas = withMark("coda");
    missing(alCoda[0], codas, "codaMissing");
    missing(codas[0], alCoda, "alCodaMissing");

    const alFine = withMark("al-fine")[0];
    missing(alFine, withMark("fine"), "fineMissing");
  },
});
