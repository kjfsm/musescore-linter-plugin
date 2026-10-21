import type { Annotation, Chord, RepeatMark, Technique } from "@score-linter/score-model";
import {
  annotationsOn,
  measureBySerial,
  restTicks,
  stableSortBy,
  tpcToAlter,
  tpcToName,
  voiceEventsIn,
} from "@score-linter/score-model";

import { defineRule } from "../engine.js";
import { directiveOf, ofKind, techniqueOf } from "./support.js";

const TOP_STAFF = 0;

/** 休符に付いていたらおかしい奏法の指示。 */
const NOT_ON_REST = new Set<Technique>([
  "pizz",
  "arco",
  "con-sord",
  "senza-sord",
  "sul-tasto",
  "sul-pont",
  "col-legno",
  "solo",
  "tutti",
  "div",
  "unis",
  "ord",
]);

export const restAnnotation = defineRule({
  id: "rest-annotation",
  meta: {
    name: "休符アノテーション",
    description: "休符位置の不適切な注記を検出",
    category: "notation",
    severity: "error",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const rests = restTicks(score, staff);
      const onRest = annotationsOn(score, staff).filter((a) => rests.has(a.tick));
      const techniques = ofKind(onRest, "text").filter((a) => {
        const technique = techniqueOf(a);
        return technique !== undefined && NOT_ON_REST.has(technique);
      });
      for (const a of techniques) {
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          message: `休符に不受理の注記 "${a.text}" が付与されています`,
        });
      }
      // 休符への強弱記号は音の受け渡しの表現として使われることもある
      for (const a of ofKind(onRest, "dynamic")) {
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          message: `休符に不受理の注記 "${a.text}" が付与されています`,
          severity: "info",
        });
      }
    }
  },
});

export const finalBarline = defineRule({
  id: "final-barline",
  meta: {
    name: "終止線の確認",
    description: "曲末の最終小節線が終止線でない箇所を検出",
    category: "notation",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    const bars = score.staves[TOP_STAFF]?.barlines ?? [];
    const [head, ...rest] = bars;
    if (!head) return;
    const last = rest.reduce((best, bar) => (bar.tick > best.tick ? bar : best), head);
    if (last.kind === "final") return;
    report({
      at: { staff: TOP_STAFF, measure: last.measure, tick: last.tick },
      message: "曲末が終止線になっていません",
    });
  },
});

export const codaSegno = defineRule({
  id: "coda-segno",
  meta: {
    name: "コーダ/セーニョ整合性",
    description: "D.S./D.C.とSegno/Coda/Fineの対応漏れを検出",
    category: "notation",
    severity: "error",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    // テンポ表記と強弱記号は反復記号を載せない
    const candidates = [
      ...ofKind(score.annotations, "text"),
      ...ofKind(score.annotations, "rehearsal"),
    ];
    const withMark = (mark: RepeatMark): Annotation[] =>
      candidates.filter((a) => a.directives.some((d) => d.type === "repeat" && d.mark === mark));

    const missing = (ref: Annotation | undefined, targets: Annotation[], message: string) => {
      if (!ref || targets.length > 0) return;
      report({ at: { measure: ref.measure, tick: ref.tick }, message });
    };

    const dalSegno = withMark("dal-segno")[0];
    missing(
      dalSegno,
      withMark("segno"),
      `"${dalSegno?.text}" がありますが、対応する Segno マークが見つかりません`,
    );

    const alCoda = withMark("al-coda");
    const codas = withMark("coda");
    missing(
      alCoda[0],
      codas,
      `"${alCoda[0]?.text}" がありますが、対応する Coda マークが見つかりません`,
    );
    missing(
      codas[0],
      alCoda,
      `Coda マークがありますが、"al Coda" を参照する記号（D.S./D.C. al Coda）が見つかりません`,
    );

    const alFine = withMark("al-fine")[0];
    missing(
      alFine,
      withMark("fine"),
      `"${alFine?.text}" がありますが、対応する Fine マークが見つかりません`,
    );
  },
});

/** A=1..Z=26 と、AA=27・BB=28 の繰り返し表記、AB のような 26 進表記、数字。読めなければ null。 */
function rehearsalRank(label: string): number | null {
  const t = label.trim();
  if (t.length === 0) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const up = t.toUpperCase();
  if (!/^[A-Z]+$/.test(up)) return null;
  if (up.split("").every((c) => c === up[0])) return (up.length - 1) * 26 + (up.charCodeAt(0) - 64);
  let n = 0;
  for (const c of up) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

export const rehearsalMarkOrder = defineRule({
  id: "rehearsal-mark-order",
  meta: {
    name: "リハーサルマークの順序",
    description: "リハーサルマークの順序の乱れ・重複を検出",
    category: "notation",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    // 同じマークが複数の譜表に同じ tick で現れることがある
    const seenAt = new Set<string>();
    const marks = stableSortBy(ofKind(score.annotations, "rehearsal"), (a, b) => a.tick - b.tick)
      .map((a) => ({ a, label: directiveOf(a, "rehearsal")?.label ?? a.text.trim() }))
      .filter(({ a, label }) => {
        if (label.length === 0) return false;
        const key = `${a.tick}|${label.toLowerCase()}`;
        if (seenAt.has(key)) return false;
        seenAt.add(key);
        return true;
      });

    const seen = new Set<string>();
    let lastRank: number | null = null;
    let lastLabel = "";
    for (const { a, label } of marks) {
      const at = { measure: a.measure, tick: a.tick };
      if (seen.has(label.toLowerCase())) {
        // 重複は重複として報告し、順序の判定には使わない
        report({ at, message: `リハーサルマーク「${label}」が重複しています`, detail: { label } });
        continue;
      }
      seen.add(label.toLowerCase());
      const rank = rehearsalRank(label);
      if (rank !== null && lastRank !== null && rank <= lastRank) {
        report({
          at,
          message: `リハーサルマークの順序が逆転しています（「${lastLabel}」の後に「${label}」）`,
          detail: { previous: lastLabel, current: label },
        });
      }
      if (rank !== null) {
        lastRank = rank;
        lastLabel = label;
      }
    }
  },
});

export const repeatBarlineMatch = defineRule({
  id: "repeat-barline-match",
  meta: {
    name: "リピート小節線の対応",
    description: "リピート開始に対応する終了が無い箇所を検出",
    category: "notation",
    severity: "warning",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    // 終了リピートだけなら曲頭からの反復として正しい。開いたまま閉じない開始だけを報告する。
    let open: { measure: number; tick: number } | null = null;
    const unclosed = (at: { measure: number; tick: number }) =>
      report({
        at: { staff: TOP_STAFF, ...at },
        message: "リピート開始に対応する終了リピートがありません",
      });
    for (const bar of score.staves[TOP_STAFF]?.barlines ?? []) {
      if (bar.kind === "repeat-start") {
        if (open) unclosed(open);
        open = { measure: bar.measure, tick: bar.tick };
      } else if (bar.kind === "repeat-end") {
        open = null;
      } else if (bar.kind === "repeat-both") {
        open = { measure: bar.measure, tick: bar.tick };
      }
    }
    if (open) unclosed(open);
  },
});

function alterName(alter: number): string {
  switch (alter) {
    case 0:
      return "ナチュラル";
    case 1:
      return "シャープ";
    case -1:
      return "フラット";
    case 2:
      return "ダブルシャープ";
    case -2:
      return "ダブルフラット";
    default:
      return "臨時記号";
  }
}

export const courtesyAccidental = defineRule({
  id: "courtesy-accidental",
  meta: {
    name: "親切臨時記号の提案",
    description: "親切臨時記号を付けた方がよい箇所を提案",
    category: "notation",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    // 前の小節で臨時記号が付いた音が、小節線で打ち消されたあと記号なしで再び現れるなら、
    // 出版譜の慣習では念のための臨時記号を補う。
    for (const staff of score.staves) {
      const placed: { chord: Chord; voice: number }[] = [];
      staff.voices.forEach((v, voice) => {
        for (const e of v.events) if (e.type === "chord") placed.push({ chord: e, voice });
      });
      const chords = stableSortBy(
        placed,
        (a, b) =>
          a.chord.measure - b.chord.measure || a.chord.tick - b.chord.tick || a.voice - b.voice,
      );
      const lastExplicit = new Map<number, { measure: number; alter: number }>();
      const suggested = new Set<string>();

      for (const { chord } of chords) {
        for (const note of chord.notes) {
          const alter = tpcToAlter(note.tpc);
          if (note.accidentalShown) {
            lastExplicit.set(note.line, { measure: chord.measure, alter });
            continue;
          }
          const prev = lastExplicit.get(note.line);
          if (!prev || prev.measure !== chord.measure - 1 || prev.alter === alter) continue;
          const key = `${note.line}:${chord.measure}`;
          if (suggested.has(key)) continue;
          suggested.add(key);
          report({
            at: { staff: staff.index, measure: chord.measure, tick: chord.tick },
            message: `${tpcToName(note.tpc)} に親切のための${alterName(alter)}を補うとよいかもしれません（前の小節で${alterName(prev.alter)}が付いていた音）`,
            detail: {
              line: note.line,
              previousMeasure: prev.measure,
              previousAlter: prev.alter,
              currentAlter: alter,
            },
          });
        }
      }
    }
  },
});

export const rehearsalMarkPosition = defineRule({
  id: "rehearsal-mark-position",
  meta: {
    name: "リハーサルマークの位置",
    description: "小節の頭に無いリハーサルマークを検出",
    category: "notation",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    const seen = new Set<number>();
    for (const a of ofKind(score.annotations, "rehearsal")) {
      if (seen.has(a.tick)) continue;
      seen.add(a.tick);
      const measure = measureBySerial(score, a.measure);
      if (!measure || measure.startTick === a.tick) continue;
      report({
        at: { measure: a.measure, tick: a.tick },
        message: `リハーサルマーク「${a.text.trim()}」が小節の頭にありません`,
        detail: { measureStartTick: measure.startTick },
      });
    }
  },
});

export const fermataConsistency = defineRule({
  id: "fermata-consistency",
  meta: {
    name: "フェルマータの食い違い",
    description: "他のパートにあるフェルマータが無い譜表を検出",
    category: "notation",
    severity: "warning",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    const withFermata = new Map<number, { staves: Set<number>; tick: number }>();
    for (const staff of score.staves) {
      for (const voice of staff.voices) {
        for (const e of voice.events) {
          if (!e.fermata) continue;
          const entry = withFermata.get(e.measure);
          if (!entry) withFermata.set(e.measure, { staves: new Set([staff.index]), tick: e.tick });
          else {
            entry.staves.add(staff.index);
            entry.tick = Math.min(entry.tick, e.tick);
          }
        }
      }
    }
    // 位置は比べない。全休符の上のフェルマータは小節の頭に付き、旋律の音符のフェルマータと位置がずれる。
    // 譜表ではなくパートで比べる。ピアノは片手の譜表にだけフェルマータを書くことがある
    for (const [measure, { staves, tick }] of [...withFermata].sort((a, b) => a[0] - b[0])) {
      for (const part of score.parts) {
        if (part.staves.some((s) => staves.has(s))) continue;
        const played = part.staves.find((s) =>
          score.staves[s]?.voices.some((_, v) => voiceEventsIn(score, s, v, measure).length > 0),
        );
        if (played === undefined) continue;
        report({
          at: { staff: played, measure, tick },
          message: "他のパートにあるフェルマータがこのパートにありません",
          detail: { stavesWithFermata: [...staves].sort((a, b) => a - b) },
        });
      }
    }
  },
});
