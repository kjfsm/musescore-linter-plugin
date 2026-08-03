import { CANONICAL, buildIR } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { measureAtTick } from "../../src/base/query.js";

const K = CANONICAL.elementKinds;
const WHOLE = 1920;

/** 4/4 が 3 小節。イベントは 1 小節目の頭にしか置かない。 */
function threeMeasures() {
  return buildIR({
    parts: [{ partName: "Vn1" }],
    measures: [
      { measure: 1, startTick: 0, ticks: WHOLE, timeSigN: 4, timeSigD: 4 },
      { measure: 2, startTick: WHOLE, ticks: WHOLE, timeSigN: 4, timeSigD: 4 },
      { measure: 3, startTick: WHOLE * 2, ticks: WHOLE, timeSigN: 4, timeSigD: 4 },
    ],
    events: [{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 }],
  });
}

describe("measureAtTick", () => {
  it("小節の先頭 tick でその小節を返す", () => {
    const ir = threeMeasures();
    expect(measureAtTick(ir, 0)).toBe(1);
    expect(measureAtTick(ir, WHOLE)).toBe(2);
    expect(measureAtTick(ir, WHOLE * 2)).toBe(3);
  });

  // ヘアピンの終端など、音符が 1 つも無い tick を指すケース。以前は
  // byTick を引いていたので 0 になり、compareIssues の並びで先頭に来ていた。
  it("イベントが無い tick でも含まれる小節を返す", () => {
    const ir = threeMeasures();
    expect(measureAtTick(ir, WHOLE + 1)).toBe(2);
    expect(measureAtTick(ir, WHOLE * 2 - 1)).toBe(2);
    expect(measureAtTick(ir, WHOLE * 3 - 1)).toBe(3);
  });

  it("最初の小節より前の tick は 0", () => {
    const ir = buildIR({
      parts: [{ partName: "Vn1" }],
      measures: [{ measure: 2, startTick: WHOLE, ticks: WHOLE, timeSigN: 4, timeSigD: 4 }],
    });
    expect(measureAtTick(ir, 0)).toBe(0);
  });

  it("measures を持たない IR ではイベントの measure にフォールバックする", () => {
    const ir = buildIR({
      parts: [{ partName: "Vn1" }],
      events: [{ kind: K.CHORD, staff: 0, tick: 480, measure: 7 }],
    });
    expect(measureAtTick(ir, 480)).toBe(7);
    expect(measureAtTick(ir, 481)).toBe(0);
  });
});
