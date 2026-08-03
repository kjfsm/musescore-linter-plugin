import { buildIR, ensureDerived } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { slurCoversTick, tieCoversTick } from "../../src/base/query.js";

/** 二分探索版の比較対象。以前の実装（全件走査）と同じ判定。 */
function linearCovers(
  spans: { voice: number; startTick: number; endTick: number }[],
  voice: number,
  tick: number,
): boolean {
  return spans.some((s) => s.voice === voice && s.startTick <= tick && tick < s.endTick);
}

describe("slurCoversTick / tieCoversTick", () => {
  // 入れ子・重なり・隣接・別声部を混ぜた配置。startTick 昇順でなくても
  // ensureDerived がソートするので、二分探索の前提はそこで満たされる。
  const slurs = [
    { staffIdx: 0, voice: 0, startTick: 480, endTick: 960 },
    { staffIdx: 0, voice: 0, startTick: 0, endTick: 1920 }, // 上を覆う外側のスラー
    { staffIdx: 0, voice: 1, startTick: 240, endTick: 720 }, // 別声部
    { staffIdx: 0, voice: 0, startTick: 1920, endTick: 1920 }, // 長さ 0
    { staffIdx: 0, voice: 0, startTick: 2400, endTick: 2880 },
  ];
  const ties = slurs.map((s) => ({ ...s, startPitch: null, endPitch: null }));

  const ir = buildIR({
    parts: [{ partName: "Vn1" }],
    slurs,
    ties,
    events: [{ kind: "chord", staff: 0, tick: 0, measure: 1 }],
  });
  ensureDerived(ir);

  it("全 tick・全声部で従来の全件走査と同じ答えを返す", () => {
    for (let voice = 0; voice <= 2; voice++) {
      for (let tick = -100; tick <= 3200; tick += 20) {
        const expected = linearCovers(slurs, voice, tick);
        expect(slurCoversTick(ir, 0, voice, tick), `voice=${voice} tick=${tick}`).toBe(expected);
        expect(tieCoversTick(ir, 0, voice, tick), `voice=${voice} tick=${tick}`).toBe(expected);
      }
    }
  });

  it("スパナを持たない譜表では false", () => {
    expect(slurCoversTick(ir, 9, 0, 480)).toBe(false);
    expect(tieCoversTick(ir, 9, 0, 480)).toBe(false);
  });
});
