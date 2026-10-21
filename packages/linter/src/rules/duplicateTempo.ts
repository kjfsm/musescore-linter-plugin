import type { Annotation } from "@score-linter/score-model";
import { annotationsAffecting, normalizeText, stableSortBy } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { directiveOf, ofKind, staffOfScope } from "./support/common.ts";
import { bpmOf, TOP_STAFF } from "./support/tempo.ts";

export const duplicateTempo = defineRule({
  id: "duplicate-tempo",
  meta: {
    name: "重複・矛盾するテンポ表記",
    description: "同じ位置の矛盾するテンポ、変化を挟まないテンポや rit. 等の書き直しを検出",
    category: "tempo",
    severity: "warning",
    tier: "recommended",
    docs: "同じ位置で BPM の違うテンポ表記（warning）、同じ位置の重ね書き、変化を挟まない同じ BPM の言い直しや、解除されないまま重ねて書いた `rit.` 等（info）",
  },
  options: {},
  messages: {
    conflicting: "同じ位置に BPM の違うテンポ表記があります（{previousBpm} と {bpm}）",
    stacked: '同じ位置にテンポ表記 "{text}" が重ねて付いています',
    restated:
      'テンポ表記 "{text}" が変化を挟まずに繰り返されています（前回: {{measure:previousMeasure}}）',
    repeatedChange:
      "「{text}」が解除されないまま再び書かれています（前回: {{measure:previousMeasure}}）",
  },
  examples: {
    invalid: [
      {
        score: {
          annotations: [
            { staff: 0, tick: 0, text: "Allegro", kind: "tempo", bpm: 120 },
            { staff: 0, tick: 0, text: "Fast", kind: "tempo", bpm: 140 },
          ],
        },
      },
      {
        score: {
          annotations: [
            { staff: 0, tick: 0, text: "Allegro", kind: "tempo", bpm: 120 },
            { staff: 0, measure: 5, tick: 1920, text: "♩ = 120", kind: "tempo", bpm: 120 },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          annotations: [
            { staff: 0, tick: 0, text: "Allegro", kind: "tempo", bpm: 120 },
            { staff: 0, measure: 3, tick: 960, text: "rit." },
            { staff: 0, measure: 5, tick: 1920, text: "♩ = 120", kind: "tempo", bpm: 120 },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    const gradualTicks: number[] = [];
    const gradual: Annotation[] = [];
    const resolveTicks: number[] = [];
    for (const a of score.annotations) {
      if (a.kind !== "tempo" && a.kind !== "text") continue;
      if (a.directives.some((d) => d.type === "tempo-change" && d.change === "gradual")) {
        gradualTicks.push(a.tick);
        gradual.push(a);
      }
      const resets = a.directives.some((d) => d.type === "tempo-change" && d.change === "reset");
      if (resets || (a.kind === "tempo" && bpmOf(a) !== null)) resolveTicks.push(a.tick);
    }
    const anyBetween = (ticks: number[], from: number, to: number) =>
      ticks.some((t) => t >= from && t < to);

    const tempos = stableSortBy(
      ofKind(annotationsAffecting(score, TOP_STAFF), "tempo"),
      (a, b) => a.tick - b.tick,
    );
    let previous: Annotation | null = null;
    for (const tempo of tempos) {
      const bpm = bpmOf(tempo);
      const prev: Annotation | null = previous;
      if (prev && prev.tick === tempo.tick) {
        const prevBpm = bpmOf(prev);
        if (bpm !== null && prevBpm !== null && bpm !== prevBpm) {
          report({
            at: { staff: TOP_STAFF, measure: tempo.measure, tick: tempo.tick },
            messageId: "conflicting",
            data: { previousBpm: prevBpm, bpm },
            detail: { bpms: [prevBpm, bpm] },
          });
        } else if (bpm === prevBpm && normalizeText(tempo.text) === normalizeText(prev.text)) {
          report({
            at: { staff: TOP_STAFF, measure: tempo.measure, tick: tempo.tick },
            messageId: "stacked",
            data: { text: tempo.text },
            detail: { bpms: [prevBpm, bpm] },
            severity: "info",
          });
        }
        continue;
      }
      previous = tempo;
      if (!prev || bpm === null || bpm !== bpmOf(prev)) continue;
      // BPM だけの表記は前の速度語を引き継ぐので、語が無ければ同じ表記とみなす
      const word = directiveOf(tempo, "tempo")?.word ?? null;
      if (word !== null && word !== directiveOf(prev, "tempo")?.word) continue;
      if (anyBetween(gradualTicks, prev.tick, tempo.tick)) continue;
      report({
        at: { staff: TOP_STAFF, measure: tempo.measure, tick: tempo.tick },
        messageId: "restated",
        data: { text: tempo.text },
        detail: { previousMeasure: prev.measure, bpm },
        severity: "info",
      });
    }

    // パートごとに書いた rit. は位置が少しずれることがあるので、注記の付いた先ごとに比べる
    const byScope = new Map<string, Annotation[]>();
    for (const a of gradual) {
      const key = JSON.stringify(a.scope);
      const list = byScope.get(key);
      if (list) list.push(a);
      else byScope.set(key, [a]);
    }
    for (const list of byScope.values()) {
      const sorted = stableSortBy(list, (a, b) => a.tick - b.tick);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]!;
        const cur = sorted[i]!;
        if (cur.tick === prev.tick || normalizeText(cur.text) !== normalizeText(prev.text))
          continue;
        // 前の rit. と同じ位置の a tempo はその rit. より前に効くので、解除に数えない
        if (anyBetween(resolveTicks, prev.tick + 1, cur.tick + 1)) continue;
        const staff = staffOfScope(score, cur.scope);
        report({
          at: { ...(staff !== undefined ? { staff } : {}), measure: cur.measure, tick: cur.tick },
          messageId: "repeatedChange",
          data: { text: cur.text.trim() },
          detail: { previousMeasure: prev.measure },
          severity: "info",
        });
      }
    }
  },
});
