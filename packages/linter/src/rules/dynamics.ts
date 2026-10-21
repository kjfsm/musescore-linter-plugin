import type { Annotation, Score } from "@score-linter/score-model";
import {
  annotationsAffecting,
  annotationsOn,
  chordsOnStaff,
  firstChord,
  hairpinsOn,
  lastTick,
  measureAt,
  measureBySerial,
  normalizeText,
  stableSortBy,
  tiesOn,
} from "@score-linter/score-model";

import { defineRule } from "../engine.js";
import {
  directiveOf,
  ofKind,
  restOnlyEndpoints,
  staffChords,
  staffOfScope,
  tieEnds,
} from "./support.js";

const dynamicsOn = (score: Score, staff: number) => ofKind(annotationsOn(score, staff), "dynamic");
const dynamicsAffecting = (score: Score, staff: number) =>
  ofKind(annotationsAffecting(score, staff), "dynamic");
const isDynamicChange = (a: Annotation) => directiveOf(a, "dynamic-change") !== undefined;

export const firstNoteDynamics = defineRule({
  id: "first-note-dynamics",
  meta: {
    name: "各パート冒頭ダイナミクス",
    description: "各パート1音目のダイナミクス欠落を検出",
    category: "dynamics",
    severity: "error",
    tier: "recommended",
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const chord = firstChord(score, staff);
      if (!chord) continue;
      if (dynamicsAffecting(score, staff).some((a) => a.tick === chord.tick)) continue;
      report({
        at: { staff, measure: chord.measure, tick: chord.tick },
        message: "1音目にダイナミクスがありません",
      });
    }
  },
});

// sf と rf はアクセントとして続けて使われることが多い
const CONSECUTIVE_ALLOWED = new Set(["sf", "rf"]);

export const duplicateDynamics = defineRule({
  id: "duplicate-dynamics",
  meta: {
    name: "重複ダイナミクス",
    description: "同じ強弱記号が変化なく連続する箇所を検出",
    category: "dynamics",
    severity: "info",
    tier: "pedantic",
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const hairpins = hairpinsOn(score, staff);
      let previous: Annotation | null = null;
      // 記号（mark）ではなくテキスト全体で比べる。「f」のあとの「più f」は変化である。
      for (const a of stableSortBy(dynamicsOn(score, staff), (x, y) => x.tick - y.tick)) {
        const text = normalizeText(a.text);
        const prev: Annotation | null = previous;
        previous = a;
        if (!prev || text === "" || text !== normalizeText(prev.text)) continue;
        const dynamic = directiveOf(a, "dynamic");
        if (dynamic && dynamic.modifier === "" && CONSECUTIVE_ALLOWED.has(dynamic.mark)) continue;
        if (hairpins.some((h) => h.startTick >= prev.tick && h.startTick < a.tick)) continue;
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          message: `${a.text || "(同一)"} が変化なく連続しています（前回: {{measure:previousMeasure}}）`,
          detail: { previousMeasure: prev.measure },
        });
      }
    }
  },
});

export const simultaneousDynamics = defineRule({
  id: "simultaneous-dynamics",
  meta: {
    name: "同時ダイナミクスの衝突",
    description: "同じ位置で強弱記号が矛盾する箇所を検出",
    category: "dynamics",
    severity: "warning",
    tier: "recommended",
  },
  options: {},
  run({ score, report }) {
    // 修飾語は比べない。「f」と「f espr.」が同じ位置にあるのは衝突ではない。
    const identity = (a: Annotation) => {
      const dynamic = directiveOf(a, "dynamic");
      return dynamic ? `mark:${dynamic.mark}` : `text:${normalizeText(a.text)}`;
    };
    for (const { index: staff } of score.staves) {
      const byTick = new Map<number, Annotation[]>();
      for (const a of dynamicsOn(score, staff)) {
        const group = byTick.get(a.tick);
        if (group) group.push(a);
        else byTick.set(a.tick, [a]);
      }
      const ticks = [...byTick.keys()].sort((a, b) => a - b);
      for (const tick of ticks) {
        const group = byTick.get(tick)!;
        const first = group[0]!;
        if (group.length < 2 || new Set(group.map(identity)).size < 2) continue;
        const texts = group.map((a) => a.text || "(?)");
        report({
          at: { staff, measure: first.measure, tick },
          message: `同じ位置に異なるダイナミクスが同時に付いています（${texts.join(" / ")}）`,
          detail: { dynamics: group.map((a) => a.text) },
        });
      }
    }
  },
});

export const hairpinTargetDynamic = defineRule({
  id: "hairpin-target-dynamic",
  meta: {
    name: "ヘアピンの到達先ダイナミクス",
    description: "ヘアピンの到達先にダイナミクスが無い箇所を検出",
    category: "dynamics",
    severity: "info",
    tier: "recommended",
  },
  options: {},
  run({ score, report }) {
    const end = lastTick(score);
    for (const hp of score.hairpins) {
      if (dynamicsAffecting(score, hp.staff).some((a) => a.tick === hp.endTick)) continue;
      // 曲尾まで伸びるヘアピン（dim. al niente など）は到達先を持たないのが普通
      if (hp.endTick >= end) continue;
      report({
        at: {
          staff: hp.staff,
          measure: measureAt(score, hp.endTick)?.serial ?? 0,
          tick: hp.endTick,
        },
        message: "ヘアピンの到達先にダイナミクスがありません",
        detail: { startTick: hp.startTick, endTick: hp.endTick },
      });
    }
  },
});

export const hairpinOnRest = defineRule({
  id: "hairpin-on-rest",
  meta: {
    name: "休符上のヘアピン端点",
    description: "ヘアピンの端点が休符上にある箇所を検出",
    category: "dynamics",
    // slur-on-rest（warning）とわざと非対称。休符に掛かるスラーは明確な誤りだが、
    // ヘアピンの端点が休符上に来るのは実務では珍しくない。
    severity: "info",
    tier: "pedantic",
  },
  options: {},
  run({ score, report }) {
    for (const hit of restOnlyEndpoints(score, score.hairpins, "hairpin")) {
      report({
        at: { staff: hit.staff, measure: measureAt(score, hit.tick)?.serial ?? 0, tick: hit.tick },
        message: `ヘアピンの${hit.endpoint}端点が休符上にあります`,
        detail: hit.detail,
      });
    }
  },
});

export const crescTextResolution = defineRule({
  id: "cresc-text-resolution",
  meta: {
    name: "cresc./dim. の到達先",
    description: "テキスト式cresc./dim.の到達先ダイナミクス欠落を検出",
    category: "dynamics",
    severity: "info",
    tier: "recommended",
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const targets = dynamicsAffecting(score, staff)
        .filter((a) => !isDynamicChange(a))
        .map((a) => a.tick);
      for (const a of dynamicsOn(score, staff)) {
        if (!isDynamicChange(a)) continue;
        if (targets.some((t) => t > a.tick)) continue;
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          message: `"${a.text}" の後に到達先の強弱記号がありません`,
        });
      }
    }
  },
});

export const tieContinuationDynamic = defineRule({
  id: "tie-continuation-dynamic",
  meta: {
    name: "タイで続く音の強弱記号",
    description: "タイで続くだけの音（新しく弾かない音）に付いた強弱記号を検出",
    category: "dynamics",
    // 持続中の強弱の変化として意図して書くこともある
    severity: "info",
    tier: "pedantic",
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      if (tiesOn(score, staff).length === 0) continue;
      const chords = staffChords(score, staff);
      const ties = tieEnds(score, staff);
      const voiceCount = score.staves[staff]?.voices.length ?? 0;
      const onlyContinued = (tick: number): boolean => {
        let found = false;
        for (let voice = 0; voice < voiceCount; voice++) {
          const chord = chords.at(voice, tick);
          if (!chord) continue;
          if (!ties.allContinued(voice, chord)) return false;
          found = true;
        }
        return found;
      };
      for (const a of dynamicsOn(score, staff)) {
        // 持続音の上で cresc. や dim. を始めるのは正しい書き方
        if (isDynamicChange(a) || !onlyContinued(a.tick)) continue;
        report({
          at: { staff, measure: a.measure, tick: a.tick },
          message: `強弱記号 "${a.text}" がタイで続くだけの音に付いています`,
        });
      }
    }
  },
});

export const overlappingHairpins = defineRule({
  id: "overlapping-hairpins",
  meta: {
    name: "重なったヘアピン",
    description: "同じ譜表で前のヘアピンが終わる前に始まるヘアピンを検出",
    category: "dynamics",
    severity: "warning",
    tier: "recommended",
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      let previous: { startTick: number; endTick: number } | null = null;
      for (const hp of hairpinsOn(score, staff)) {
        if (previous && hp.startTick < previous.endTick) {
          report({
            at: { staff, measure: measureAt(score, hp.startTick)?.serial ?? 0, tick: hp.startTick },
            message: "前のヘアピンが終わる前に次のヘアピンが始まっています",
            detail: {
              previousStartTick: previous.startTick,
              previousEndTick: previous.endTick,
              startTick: hp.startTick,
              endTick: hp.endTick,
            },
          });
        }
        if (!previous || hp.endTick > previous.endTick) previous = hp;
      }
    }
  },
});

export const dynamicAfterRest = defineRule({
  id: "dynamic-after-rest",
  meta: {
    name: "休みのあとの強弱記号",
    description: "長く休んだあとの入りで強弱記号を言い直していない箇所を検出",
    category: "dynamics",
    severity: "info",
    tier: "nursery",
  },
  // オプションの型に数値が無いので、休みの長さは選択肢から選ばせる
  options: {
    restMeasures: {
      type: "select",
      label: "休みの長さ",
      description: "この小節数以上、音の無い小節が続いたあとの入りを見る",
      choices: [
        { value: "2", label: "2 小節" },
        { value: "4", label: "4 小節" },
        { value: "8", label: "8 小節" },
      ],
      default: "4",
    },
  },
  run({ score, options, report }) {
    const threshold = Number(options.restMeasures);
    for (const { index: staff } of score.staves) {
      const chords = stableSortBy(chordsOnStaff(score, staff), (a, b) => a.tick - b.tick);
      const dynamicTicks = dynamicsAffecting(score, staff)
        .filter((a) => !isDynamicChange(a))
        .map((a) => a.tick);
      let previousMeasure: number | null = null;
      for (const chord of chords) {
        const prev = previousMeasure;
        previousMeasure = chord.measure;
        if (prev === null || chord.measure - prev - 1 < threshold) continue;
        const restStart = measureBySerial(score, prev + 1)?.startTick ?? chord.tick;
        if (dynamicTicks.some((t) => t >= restStart && t <= chord.tick)) continue;
        report({
          at: { staff, measure: chord.measure, tick: chord.tick },
          message: `${chord.measure - prev - 1} 小節休んだあとの入りに強弱記号がありません`,
          detail: { restMeasures: chord.measure - prev - 1, previousMeasure: prev },
        });
      }
    }
  },
});

export const dynamicAsText = defineRule({
  id: "dynamic-as-text",
  meta: {
    name: "テキストで書いた強弱記号",
    description: "強弱記号ではなく普通のテキストで書いた強弱記号を検出",
    category: "dynamics",
    severity: "warning",
    tier: "recommended",
  },
  options: {},
  run({ score, report }) {
    for (const a of ofKind(score.annotations, "text")) {
      if (!directiveOf(a, "dynamic")) continue;
      const staff = staffOfScope(score, a.scope);
      report({
        at: { ...(staff !== undefined ? { staff } : {}), measure: a.measure, tick: a.tick },
        message: `"${a.text}" が普通のテキストで書かれています。強弱記号として入れないと再生に反映されません`,
      });
    }
  },
});
