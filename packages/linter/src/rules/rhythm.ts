import type { Chord, Rest, VoiceEvent } from "@score-linter/score-model";
import {
  annotationsOn,
  hairpinsOn,
  measureAt,
  tiesOn,
  voiceEventsIn,
} from "@score-linter/score-model";

import { defineRule } from "../engine.js";
import type { Report } from "../types.js";
import type { Meter } from "./meter.js";
import {
  DURATION_NAMES,
  beatCrossing,
  beatPositionLabel,
  metersBySerial,
  noteValueTicks,
} from "./meter.js";

const restName = (ticks: number) => DURATION_NAMES[ticks]?.replace("音符", "休符") ?? null;

/**
 * 休符として拍の骨格を見せる書き方か。音符と違い、休符は 1 拍を越えるなら小節全体か
 * 小節の半分（偶数拍子）を埋めるときだけ 1 つにまとめる。3 拍子の頭の 2 拍は 2 分休符も使われる。
 */
function showsBeats(onset: number, ticks: number, meter: Meter): boolean {
  if (ticks <= meter.beatUnit) return (onset % meter.beatUnit) + ticks <= meter.beatUnit;
  if (onset === 0 && ticks === meter.ticks) return true;
  if (meter.primary > 0) return (onset === 0 || onset === meter.primary) && ticks === meter.primary;
  return onset === 0 && ticks === 2 * meter.beatUnit && meter.ticks === 3 * meter.beatUnit;
}

/** onset から ticks の休みを、拍の骨格を見せる休符の並びに割る。 */
function restSplit(onset: number, ticks: number, meter: Meter): number[] {
  const out: number[] = [];
  let cursor = onset;
  const end = onset + ticks;
  while (cursor < end) {
    const remaining = end - cursor;
    let take = Math.min(remaining, meter.beatUnit - (cursor % meter.beatUnit));
    if (meter.primary > 0 && cursor % meter.primary === 0 && remaining >= meter.primary) {
      take = meter.primary;
    }
    out.push(take);
    cursor += take;
  }
  return out;
}

/** まとめる単位。大きいものから見て、まとめられたら内側は見ない。 */
function groupsOf(meter: Meter): [number, number][] {
  const groups: [number, number][] = [[0, meter.ticks]];
  if (meter.primary > 0) groups.push([0, meter.primary], [meter.primary, meter.ticks]);
  for (let b = 0; b < meter.ticks; b += meter.beatUnit) groups.push([b, b + meter.beatUnit]);
  return groups;
}

interface Timed {
  event: VoiceEvent;
  onset: number;
  ticks: number | null;
}

const isTimedRest = (t: Timed): t is Timed & { event: Rest; ticks: number } =>
  t.event.type === "rest" && t.ticks !== null;

function checkRests(
  events: readonly VoiceEvent[],
  meter: Meter,
  staff: number,
  report: (report: Report) => void,
): void {
  const timed: Timed[] = events.map((event) => ({
    event,
    onset: event.tick - meter.startTick,
    ticks: noteValueTicks(event.duration, event.tuplet),
  }));

  for (const { event, onset, ticks } of timed) {
    if (event.type !== "rest" || ticks === null || showsBeats(onset, ticks, meter)) continue;
    const split = restSplit(onset, ticks, meter).map(restName);
    const splitLabel = split.every((n) => n !== null) ? split.join("+") : null;
    report({
      at: { staff, measure: event.measure, tick: event.tick },
      message: `${beatPositionLabel(onset, meter)} からの${restName(ticks) ?? "休符"}が拍の頭を隠しています${splitLabel ? `。${splitLabel}に分けることを推奨します` : ""}`,
      detail: { onsetTicks: onset, durationTicks: ticks, timeSig: meter.timeSig },
    });
  }

  const merged: [number, number][] = [];
  for (const [from, to] of groupsOf(meter)) {
    if (merged.some(([f, t]) => f <= from && to <= t)) continue;
    const inside = timed.filter(({ onset }) => onset >= from && onset < to);
    const rests = inside.filter(isTimedRest);
    const [first] = rests;
    if (!first || rests.length < 2 || rests.length !== inside.length) continue;
    const covered = rests.reduce((sum, r) => sum + r.ticks, 0);
    if (first.onset !== from || from + covered !== to) continue;
    merged.push([from, to]);
    const name = to - from === meter.ticks ? "小節全体の休符" : (restName(to - from) ?? "休符");
    report({
      at: { staff, measure: first.event.measure, tick: first.event.tick },
      message: `${inside.length} 個の休符を 1 つの${name}にまとめられます`,
      detail: { mergedTicks: to - from, restCount: inside.length, timeSig: meter.timeSig },
    });
  }
}

export const restGrouping = defineRule({
  id: "rest-grouping",
  meta: {
    name: "休符のまとめ方",
    description: "拍の頭を隠す休符と、1 つにまとめられる休符を検出",
    category: "notation",
    severity: "info",
    tier: "nursery",
  },
  options: {},
  run({ score, report }) {
    const meters = metersBySerial(score);
    for (const staff of score.staves) {
      staff.voices.forEach((_, voice) => {
        for (const m of score.measures) {
          const meter = meters[m.serial];
          if (!meter) continue;
          checkRests(
            voiceEventsIn(score, staff.index, voice, m.serial),
            meter,
            staff.index,
            report,
          );
        }
      });
    }
  },
});

export const mergeableTie = defineRule({
  id: "mergeable-tie",
  meta: {
    name: "まとめられるタイ",
    description: "1 つの音符で書けるタイを検出",
    category: "slur-tie",
    severity: "info",
    tier: "nursery",
  },
  options: {},
  run({ score, report }) {
    const meters = metersBySerial(score);
    for (const { index: staff } of score.staves) {
      const ties = tiesOn(score, staff);
      // 後ろの音に注記やヘアピンの端があれば、タイで分けている理由があるとみなす
      const markedTicks = new Set(annotationsOn(score, staff).map((a) => a.tick));
      for (const h of hairpinsOn(score, staff)) markedTicks.add(h.startTick).add(h.endTick);
      const seen = new Set<string>();
      for (const tie of ties) {
        const key = `${tie.voice}:${tie.startTick}:${tie.endTick}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const measure = measureAt(score, tie.startTick);
        const meter = measure ? meters[measure.serial] : null;
        if (!measure || !meter || markedTicks.has(tie.endTick)) continue;
        const events = voiceEventsIn(score, staff, tie.voice, measure.serial);
        const at = (tick: number) =>
          events.find((e): e is Chord => e.type === "chord" && e.tick === tick);
        const first = at(tie.startTick);
        const second = at(tie.endTick);
        if (!first || !second || second.articulations.length > 0) continue;

        const firstTicks = noteValueTicks(first.duration, first.tuplet);
        const secondTicks = noteValueTicks(second.duration, second.tuplet);
        if (firstTicks === null || secondTicks === null) continue;
        if (first.tick + firstTicks !== second.tick) continue;
        const tiedNotes = ties.filter(
          (t) => t.voice === tie.voice && t.startTick === first.tick && t.endTick === second.tick,
        ).length;
        if (tiedNotes < first.notes.length || first.notes.length !== second.notes.length) continue;

        const mergedTicks = firstTicks + secondTicks;
        const mergedName = DURATION_NAMES[mergedTicks];
        const onset = first.tick - meter.startTick;
        if (!mergedName || beatCrossing(onset, mergedTicks, meter)) continue;
        report({
          at: { staff, measure: first.measure, tick: first.tick },
          message: `${DURATION_NAMES[firstTicks]}と${DURATION_NAMES[secondTicks]}のタイは 1 つの${mergedName}で書けます`,
          detail: { firstTicks, secondTicks, mergedTicks, timeSig: meter.timeSig },
        });
      }
    }
  },
});
