import type { Chord } from "@score-linter/score-model";
import { measureAt, slursOn, tiesOn } from "@score-linter/score-model";

import { defineRule } from "../engine.js";
import { restOnlyEndpoints, staffChords, tieEnds } from "./support.js";

export const tiePitchMismatch = defineRule({
  id: "tie-pitch-mismatch",
  meta: {
    name: "異音程のタイ",
    description: "異なる音高をタイで結んでいる箇所を検出",
    category: "slur-tie",
    severity: "warning",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    for (const tie of score.ties) {
      if (tie.startPitch === null || tie.endPitch === null) continue;
      if (tie.startPitch === tie.endPitch) continue;
      report({
        at: {
          staff: tie.staff,
          measure: measureAt(score, tie.startTick)?.serial ?? 0,
          tick: tie.startTick,
        },
        message: `異なる音高がタイで結ばれています（${tie.startPitch}→${tie.endPitch}）。スラーの書き間違いの可能性があります`,
        detail: { startPitch: tie.startPitch, endPitch: tie.endPitch },
      });
    }
  },
});

export const slurOnRest = defineRule({
  id: "slur-on-rest",
  meta: {
    name: "休符上のスラー端点",
    description: "スラーの端点が休符上にある箇所を検出",
    category: "slur-tie",
    severity: "warning",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    for (const hit of restOnlyEndpoints(score, score.slurs, "slur")) {
      report({
        at: { staff: hit.staff, measure: measureAt(score, hit.tick)?.serial ?? 0, tick: hit.tick },
        message: `スラーの${hit.endpoint}端点が休符上にあります`,
        detail: hit.detail,
      });
    }
  },
});

export const slurSingleNote = defineRule({
  id: "slur-single-note",
  meta: {
    name: "単一音スラー",
    description: "単一音に掛かるスラーを検出",
    category: "slur-tie",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    for (const slur of score.slurs) {
      if (slur.startTick !== slur.endTick) continue;
      report({
        at: {
          staff: slur.staff,
          measure: measureAt(score, slur.startTick)?.serial ?? 0,
          tick: slur.startTick,
        },
        message: "スラーが単一音に掛かっています",
        detail: { startTick: slur.startTick, endTick: slur.endTick },
      });
    }
  },
});

export const slurTieEndpoint = defineRule({
  id: "slur-tie-endpoint",
  meta: {
    name: "タイの途中のスラー端点",
    description: "タイで続く音から始まる・タイの途中で終わるスラーを検出",
    category: "slur-tie",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      if (tiesOn(score, staff).length === 0) continue;
      const chords = staffChords(score, staff);
      const ties = tieEnds(score, staff);
      for (const slur of slursOn(score, staff)) {
        // 単一音のスラーは slur-single-note が受け持つ
        if (slur.startTick === slur.endTick) continue;
        const first = chords.at(slur.voice, slur.startTick);
        const last = chords.at(slur.voice, slur.endTick);
        const at = (tick: number) => ({
          staff,
          measure: measureAt(score, tick)?.serial ?? 0,
          tick,
        });
        const detail = { startTick: slur.startTick, endTick: slur.endTick };
        // 和音の一部だけがタイで続くなら、残りの音はそこで新しく弾かれる
        if (first && ties.allContinued(slur.voice, first)) {
          report({
            at: at(slur.startTick),
            message: "スラーがタイで続く音から始まっています。タイの最初の音から始めます",
            detail: { ...detail, endpoint: "start" },
          });
        }
        if (last && ties.allContinuing(slur.voice, last)) {
          report({
            at: at(slur.endTick),
            message: "スラーがタイの途中で終わっています。タイの最後の音まで掛けます",
            detail: { ...detail, endpoint: "end" },
          });
        }
      }
    }
  },
});

const pitchesOf = (chord: Chord): string =>
  chord.notes
    .map((n) => n.pitch)
    .sort((a, b) => (a ?? 0) - (b ?? 0))
    .join(",");

export const slurSamePitch = defineRule({
  id: "slur-same-pitch",
  meta: {
    name: "同音のスラー",
    description: "同じ音高の 2 音だけを結ぶスラー（タイの書き間違い）を検出",
    category: "slur-tie",
    severity: "warning",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const slurs = slursOn(score, staff);
      if (slurs.length === 0) continue;
      const chords = staffChords(score, staff);
      const ties = tieEnds(score, staff);
      for (const slur of slurs) {
        const first = chords.at(slur.voice, slur.startTick);
        const second = first && chords.next(first);
        if (!first || !second || second.tick !== slur.endTick) continue;
        if (first.notes.some((n) => n.pitch === null) || first.notes.length === 0) continue;
        if (pitchesOf(first) !== pitchesOf(second)) continue;
        // スラーの下のスタッカートやテヌートは同音反復の正しい書き方（ポルタート）
        if (first.articulations.length > 0 || second.articulations.length > 0) continue;
        if (ties.allContinuing(slur.voice, first)) continue;
        report({
          at: { staff, measure: first.measure, tick: first.tick },
          message: "同じ音高の 2 音をスラーで結んでいます。タイの書き間違いの可能性があります",
          detail: { startTick: slur.startTick, endTick: slur.endTick },
        });
      }
    }
  },
});

export const duplicateSlur = defineRule({
  id: "duplicate-slur",
  meta: {
    name: "重複したスラー",
    description: "同じ範囲に重ねて掛けたスラーを検出",
    category: "slur-tie",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    const seen = new Set<string>();
    for (const slur of score.slurs) {
      const key = `${slur.staff}:${slur.voice}:${slur.startTick}:${slur.endTick}`;
      if (!seen.has(key)) {
        seen.add(key);
        continue;
      }
      report({
        at: {
          staff: slur.staff,
          measure: measureAt(score, slur.startTick)?.serial ?? 0,
          tick: slur.startTick,
        },
        message: "同じ範囲にスラーが重ねて掛かっています",
        detail: { startTick: slur.startTick, endTick: slur.endTick },
      });
    }
  },
});
