import type { Rest, VoiceEvent } from "@score-linter/score-model";
import { voiceEventsIn } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import type { Report } from "../types.ts";
import type { Meter } from "./support/meter.ts";
import {
  DURATION_NAMES,
  beatPositionLabel,
  metersBySerial,
  noteValueTicks,
} from "./support/meter.ts";

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
  report: (report: Report<"hidesBeat" | "hidesBeatSplit" | "mergeable">) => void,
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
      messageId: splitLabel ? "hidesBeatSplit" : "hidesBeat",
      data: {
        position: beatPositionLabel(onset, meter),
        name: restName(ticks) ?? "休符",
        split: splitLabel ?? "",
      },
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
      messageId: "mergeable",
      data: { count: inside.length, name },
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
    docs: "拍の頭を隠す休符と、拍・小節の半分・小節全体を 1 つにまとめられる休符",
  },
  options: {},
  messages: {
    hidesBeat: "{position} からの{name}が拍の頭を隠しています",
    hidesBeatSplit:
      "{position} からの{name}が拍の頭を隠しています。{split}に分けることを推奨します",
    mergeable: "{count} 個の休符を 1 つの{name}にまとめられます",
  },
  examples: {
    invalid: [
      {
        score: {
          measures: [{ timeSignature: [4, 4] }],
          chords: [
            { tick: 0, duration: { numerator: 1, denominator: 4 } },
            { tick: 1440, duration: { numerator: 1, denominator: 4 } },
          ],
          rests: [{ tick: 480, duration: { numerator: 1, denominator: 2 } }],
        },
      },
      {
        score: {
          measures: [{ timeSignature: [4, 4] }],
          chords: [
            { tick: 0, duration: { numerator: 1, denominator: 4 } },
            { tick: 960, duration: { numerator: 1, denominator: 2 } },
          ],
          rests: [
            { tick: 480, duration: { numerator: 1, denominator: 8 } },
            { tick: 720, duration: { numerator: 1, denominator: 8 } },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          measures: [{ timeSignature: [4, 4] }],
          rests: [{ tick: 0, duration: { numerator: 1, denominator: 1 } }],
        },
      },
    ],
  },
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
