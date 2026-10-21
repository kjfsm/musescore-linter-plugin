import type { Annotation } from "@score-linter/score-model";
import { lastEventMeasure, stableSortBy } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { staffOfScope } from "./support/common.ts";
import { bpmOf } from "./support/tempo.ts";

export const tempoChangeResolution = defineRule({
  id: "tempo-change-resolution",
  meta: {
    name: "テンポ変化の解除漏れ",
    description: "rit./accel.等が解除されないまま終わる箇所を検出",
    category: "tempo",
    severity: "warning",
    tier: "recommended",
    docs: "`rit.`/`accel.` 等が `a tempo`/新テンポで解除されないまま終わる",
  },
  options: {},
  messages: {
    unresolved: "テンポ変化「{label}」が a tempo 等で解除されていません",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }, { staff: 0, tick: 1920, measure: 3 }],
          annotations: [{ staff: 0, measure: 2, tick: 480, text: "rit." }],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }, { staff: 0, tick: 1920, measure: 3 }],
          annotations: [
            { staff: 0, measure: 2, tick: 480, text: "rit." },
            { staff: 0, measure: 3, tick: 960, text: "a tempo" },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    // テンポの変化はシステム全体に効くので、パートをまたいで時間順に見る。
    // 同じ tick ではテンポ表記を先に置く。
    const events = stableSortBy(
      score.annotations.filter((a) => a.kind === "tempo" || a.kind === "text"),
      (a, b) => a.tick - b.tick || (a.kind === "tempo" ? 0 : 1) - (b.kind === "tempo" ? 0 : 1),
    );

    // 曲尾の rit. は a tempo を要らないので、最後の音楽小節は見ない
    const lastMusicMeasure = lastEventMeasure(score);

    const changes = (a: Annotation, change: "gradual" | "reset") =>
      a.directives.some((d) => d.type === "tempo-change" && d.change === change);
    const resolves = (a: Annotation) =>
      changes(a, "reset") || (a.kind === "tempo" && bpmOf(a) !== null);

    // latestResolveAfter[i] は i より後ろにある解除のうち最も遅い tick
    const latestResolveAfter: number[] = [];
    let latest = Number.NEGATIVE_INFINITY;
    for (let i = events.length - 1; i >= 0; i--) {
      latestResolveAfter[i] = latest;
      if (resolves(events[i]!)) latest = Math.max(latest, events[i]!.tick);
    }

    for (let i = 0; i < events.length; i++) {
      const ev = events[i]!;
      if (!changes(ev, "gradual")) continue;
      if (latestResolveAfter[i]! > ev.tick) continue;
      if (lastMusicMeasure > 0 && ev.measure >= lastMusicMeasure) continue;

      const label = ev.text.trim();
      const staff = staffOfScope(score, ev.scope);
      report({
        at: { ...(staff !== undefined ? { staff } : {}), measure: ev.measure, tick: ev.tick },
        messageId: "unresolved",
        data: { label },
        detail: { label },
      });
    }
  },
});
