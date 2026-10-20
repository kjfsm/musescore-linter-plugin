import { measureAt } from "@score-linter/score-model";

import { defineRule } from "../engine.js";
import { restOnlyEndpoints } from "./support.js";

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
