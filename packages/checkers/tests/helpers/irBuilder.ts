import type { EventSpec, IndexedIR, IRSpec } from "@musescore-linter/core";
import { buildIR as buildLintIR, CANONICAL, withDerived } from "@musescore-linter/core";

export type { EventSpec, IRSpec } from "@musescore-linter/core";
export { CANONICAL };

/** checker の `run` に直接渡せるよう、`derived` まで作った IR を返す。 */
export function buildIR(spec: IRSpec): IndexedIR {
  return withDerived(buildLintIR(spec));
}

const K = CANONICAL.elementKinds;
const BK = CANONICAL.barlineKinds;

/** 全チェッカーをパスするクリーンな最小 IR に追加イベントを加えたものを返す */
export function cleanIR(extra: EventSpec[] = []): IndexedIR {
  return buildIR({
    parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
    events: [
      {
        kind: K.TEMPO_TEXT,
        staff: 0,
        tick: 0,
        measure: 1,
        tempo: 2.0,
        textNorm: "allegro",
        textRaw: "Allegro",
      },
      { kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
      { kind: K.CHORD, staff: 1, tick: 0, measure: 1 },
      {
        kind: K.DYNAMIC,
        staff: 0,
        tick: 0,
        measure: 1,
        textNorm: "f",
        textRaw: "f",
      },
      {
        kind: K.DYNAMIC,
        staff: 1,
        tick: 0,
        measure: 1,
        textNorm: "f",
        textRaw: "f",
      },
      ...extra,
    ],
  });
}

/** 弦楽五重奏（Vn1/Vn2/Va/Vc/Cb）の 5 スタッフをパスするクリーン IR */
export function quintetIR(extra: EventSpec[] = []): IndexedIR {
  const staffNames = ["Vn1", "Vn2", "Va", "Vc", "Cb"];
  const chords = staffNames.map((_, i) => ({
    kind: K.CHORD,
    staff: i,
    tick: 0,
    measure: 1,
  }));
  const dynamics = staffNames.map((_, i) => ({
    kind: K.DYNAMIC,
    staff: i,
    tick: 0,
    measure: 1,
    textNorm: "f",
    textRaw: "f",
  }));
  return buildIR({
    parts: staffNames.map((name) => ({ partName: name })),
    events: [
      {
        kind: K.TEMPO_TEXT,
        staff: 0,
        tick: 0,
        measure: 1,
        tempo: 2.0,
        textNorm: "allegro",
        textRaw: "Allegro",
      },
      ...chords,
      ...dynamics,
      ...extra,
    ],
  });
}

export { BK, K };
