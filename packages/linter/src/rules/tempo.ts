import type { Annotation } from "@score-linter/score-model";
import {
  annotationsAffecting,
  firstEventTick,
  lastEventMeasure,
  normalizeText,
  stableSortBy,
} from "@score-linter/score-model";

import { defineRule } from "../engine.js";
import { directiveOf, ofKind, staffOfScope } from "./support.js";

const bpmOf = (a: Annotation): number | null => directiveOf(a, "tempo")?.bpm ?? null;

// テンポはシステム全体に効くので、最上段の譜表だけを見て重複して報告しない
const TOP_STAFF = 0;

export const tempoBarline = defineRule({
  id: "tempo-barline",
  meta: {
    name: "テンポ変更と複縦線",
    description: "テンポ変更前に複縦線が無い箇所を検出",
    category: "tempo",
    severity: "info",
    tier: "pedantic",
  },
  options: {},
  run({ score, report }) {
    const staff = score.staves[TOP_STAFF];
    if (!staff) return;

    const barlines = staff.barlines;
    const kindByMeasure = new Map<number, string>();
    for (const bar of barlines) kindByMeasure.set(bar.measure, bar.kind);

    const seen = new Set<number>();
    const tempos = stableSortBy(
      ofKind(annotationsAffecting(score, TOP_STAFF), "tempo"),
      (a, b) => a.tick - b.tick || a.measure - b.measure,
    ).filter((a) => {
      if (seen.has(a.tick)) return false;
      seen.add(a.tick);
      return true;
    });

    const firstTick = tempos[0]?.tick ?? null;
    let previousBpm: number | null = null;
    let cursor = -1;
    for (const tempo of tempos) {
      const bpm = bpmOf(tempo);
      if (tempo.tick === firstTick) {
        previousBpm = bpm;
        continue;
      }
      if (previousBpm !== null && bpm !== null && bpm === previousBpm) continue;
      previousBpm = bpm;

      while (cursor + 1 < barlines.length && barlines[cursor + 1]!.tick < tempo.tick) cursor++;
      const barBefore = cursor >= 0 ? barlines[cursor]! : null;
      const previousMeasure = tempo.measure - 1;
      if (kindByMeasure.get(previousMeasure) === "double" || barBefore?.kind === "double") continue;

      report({
        at: { staff: TOP_STAFF, measure: previousMeasure, tick: tempo.tick },
        message: `テンポ変更（${tempo.text}）の前の小節に複縦線がありません`,
      });
    }
  },
});

export const openingTempo = defineRule({
  id: "opening-tempo",
  meta: {
    name: "冒頭テンポ表記",
    description: "曲頭のテンポ表記の欠落を検出",
    category: "tempo",
    severity: "error",
    tier: "recommended",
  },
  options: {},
  run({ score, report }) {
    const first = firstEventTick(score, TOP_STAFF);
    if (first === null) return;
    const tempos = ofKind(annotationsAffecting(score, TOP_STAFF), "tempo");
    if (tempos.some((a) => a.tick <= first)) return;
    report({
      at: { staff: TOP_STAFF, measure: 1, tick: first },
      message: "冒頭にテンポ表記がありません",
    });
  },
});

export const tempoWithoutBpm = defineRule({
  id: "tempo-without-bpm",
  meta: {
    name: "BPM 値なしテンポ",
    description: "BPM値のないテンポ表記を検出",
    category: "tempo",
    severity: "warning",
    tier: "pedantic",
  },
  options: {},
  run({ score, report }) {
    for (const a of ofKind(score.annotations, "tempo")) {
      if (bpmOf(a) !== null) continue;
      const staff = staffOfScope(score, a.scope);
      report({
        at: { ...(staff !== undefined ? { staff } : {}), measure: a.measure, tick: a.tick },
        message: `テンポ表記 "${a.text || "(無題)"}" に BPM 値が設定されていません`,
      });
    }
  },
});

export const tempoChangeResolution = defineRule({
  id: "tempo-change-resolution",
  meta: {
    name: "テンポ変化の解除漏れ",
    description: "rit./accel.等が解除されないまま終わる箇所を検出",
    category: "tempo",
    severity: "warning",
    tier: "recommended",
  },
  options: {},
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
        message: `テンポ変化「${label}」が a tempo 等で解除されていません`,
        detail: { label },
      });
    }
  },
});

export const duplicateTempo = defineRule({
  id: "duplicate-tempo",
  meta: {
    name: "重複・矛盾するテンポ表記",
    description: "同じ位置の矛盾するテンポ、変化を挟まないテンポや rit. 等の書き直しを検出",
    category: "tempo",
    severity: "warning",
    tier: "recommended",
  },
  options: {},
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
            message: `同じ位置に BPM の違うテンポ表記があります（${prevBpm} と ${bpm}）`,
            detail: { bpms: [prevBpm, bpm] },
          });
        } else if (bpm === prevBpm && normalizeText(tempo.text) === normalizeText(prev.text)) {
          report({
            at: { staff: TOP_STAFF, measure: tempo.measure, tick: tempo.tick },
            message: `同じ位置にテンポ表記 "${tempo.text}" が重ねて付いています`,
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
        message: `テンポ表記 "${tempo.text}" が変化を挟まずに繰り返されています（前回: {{measure:previousMeasure}}）`,
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
          message: `「${cur.text.trim()}」が解除されないまま再び書かれています（前回: {{measure:previousMeasure}}）`,
          detail: { previousMeasure: prev.measure },
          severity: "info",
        });
      }
    }
  },
});
