import { defineRule } from "../engine.js";
import type { Severity } from "../types.js";
import {
  DURATION_NAMES,
  beatCrossing,
  beatPositionLabel,
  crossedBoundariesLabel,
  describeSplit,
  metersBySerial,
  noteValueTicks,
  splitSegments,
} from "./meter.js";

// 拍の骨格を隠す音符（イマジナリーバーライン違反）を検出し、タイでの分割案を出す。

export const beatCrossingTie = defineRule({
  id: "beat-crossing-tie",
  meta: {
    name: "拍をまたぐ音符の分割",
    description: "拍をまたぐ音符(分割推奨)を検出",
    category: "slur-tie",
    // 小節線や主要拍をまたぐときは warning を出す
    severity: "warning",
    tier: "pedantic",
  },
  options: {},
  run({ score, report }) {
    const meters = metersBySerial(score);

    for (const staff of score.staves) {
      for (const voice of staff.voices) {
        for (const ev of voice.events) {
          if (ev.type !== "chord") continue;
          const meter = meters[ev.measure];
          if (!meter) continue;

          const onset = ev.tick - meter.startTick;
          if (onset < 0) continue;

          const durTicks = noteValueTicks(ev.duration, ev.tuplet);
          if (durTicks === null) continue;
          const crossing = beatCrossing(onset, durTicks, meter);
          if (!crossing) continue;
          const { crossesPrimary, crossesBarline } = crossing;
          const end = onset + durTicks;

          const severity: Severity = crossesBarline || crossesPrimary ? "warning" : "info";

          // 小節線をまたぐときは、まず小節線で切り、残りは次の小節の 1 断片として出すに留める
          // （次の小節の拍子は別なので）
          const inMeasureEnd = crossesBarline ? meter.ticks : end;
          const segments = splitSegments(onset, inMeasureEnd, meter.beatUnit);
          if (crossesBarline) segments.push(end - meter.ticks);

          const position = beatPositionLabel(onset, meter);
          const crossed = crossedBoundariesLabel(
            onset,
            inMeasureEnd,
            meter.beatUnit,
            crossesBarline,
          );
          const noteName = DURATION_NAMES[durTicks] ?? "音符";
          const after = describeSplit(segments);
          const suggestion = after ? `${after}のタイに分割することを推奨します` : "";

          report({
            at: { staff: staff.index, measure: ev.measure, tick: ev.tick },
            severity,
            message: `${position} から始まる${noteName}が${crossed}をまたいでいます。${suggestion}`,
            detail: {
              position,
              crossedBeats: crossed,
              onsetTicks: onset,
              durationTicks: durTicks,
              suggestedSplit: segments,
              crossesPrimaryBoundary: crossesPrimary,
              crossesBarline,
              timeSig: meter.timeSig,
            },
          });
        }
      }
    }
  },
});
