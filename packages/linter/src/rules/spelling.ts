import type { Chord, Score } from "@score-linter/score-model";
import { keyAt, stableSortBy, tpcToAlter, tpcToName } from "@score-linter/score-model";

import { defineRule } from "../engine.js";

interface Placed {
  chord: Chord;
  staff: number;
  voice: number;
}

function chordsInOrder(score: Score, staves: readonly number[]): Placed[] {
  const placed: Placed[] = [];
  for (const staff of staves) {
    score.staves[staff]?.voices.forEach((v, voice) => {
      for (const e of v.events) if (e.type === "chord") placed.push({ chord: e, staff, voice });
    });
  }
  return stableSortBy(
    placed,
    (a, b) =>
      a.chord.measure - b.chord.measure ||
      a.chord.tick - b.chord.tick ||
      a.staff - b.staff ||
      a.voice - b.voice,
  );
}

export const enharmonicSpelling = defineRule({
  id: "enharmonic-spelling",
  meta: {
    name: "異名同音の不統一",
    description: "同じ音高を同時に・続けて違う綴りで書いている箇所を検出",
    category: "notation",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    // 移調楽器の記譜が実音と混ざらないよう、比べるのは同じパートの中だけ
    for (const part of score.parts) {
      const placed = chordsInOrder(score, part.staves);

      const atTick = new Map<
        string,
        { staff: number; tick: number; measure: number; tpcs: Set<number> }
      >();
      for (const { chord, staff } of placed) {
        for (const note of chord.notes) {
          if (note.pitch === null) continue;
          const key = `${chord.tick}:${note.pitch}`;
          const entry = atTick.get(key);
          if (entry) entry.tpcs.add(note.tpc);
          else
            atTick.set(key, {
              staff,
              tick: chord.tick,
              measure: chord.measure,
              tpcs: new Set([note.tpc]),
            });
        }
      }
      for (const { staff, tick, measure, tpcs } of atTick.values()) {
        if (tpcs.size < 2) continue;
        const spellings = [...tpcs].sort((a, b) => b - a).map(tpcToName);
        report({
          at: { staff, measure, tick },
          message: `同じ音高を同時に違う綴りで書いています（${spellings.join(" / ")}）`,
          detail: { spellings },
        });
      }

      const lastInVoice = new Map<string, Chord>();
      for (const { chord, staff, voice } of placed) {
        const key = `${staff}:${voice}`;
        const prev = lastInVoice.get(key);
        lastInVoice.set(key, chord);
        // 小節をまたいだ綴りの変更は、転調の書き方として許す
        if (!prev || prev.measure !== chord.measure) continue;
        for (const note of chord.notes) {
          const before = prev.notes.find((n) => n.pitch !== null && n.pitch === note.pitch);
          if (!before || before.tpc === note.tpc) continue;
          const spellings = [tpcToName(before.tpc), tpcToName(note.tpc)];
          report({
            at: { staff, measure: chord.measure, tick: chord.tick },
            message: `直前と同じ音高を違う綴りで書いています（${spellings.join(" → ")}）`,
            detail: { spellings },
          });
        }
      }
    }
  },
});

export const redundantAccidental = defineRule({
  id: "redundant-accidental",
  meta: {
    name: "不要な臨時記号",
    description: "同じ小節で既に有効な臨時記号をもう一度付けている箇所を検出",
    category: "notation",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      let measure = -1;
      const inEffect = new Map<number, { alter: number; tick: number }>();
      for (const { chord } of chordsInOrder(score, [staff])) {
        if (chord.measure !== measure) {
          measure = chord.measure;
          inEffect.clear();
        }
        for (const note of chord.notes) {
          const alter = tpcToAlter(note.tpc);
          // 記号の無い音（調号やタイで効いている変化）のあとの臨時記号は、MuseScore が自動では
          // 出さないので、人が付けた親切記号である。表示された臨時記号どうしだけを比べる
          if (!note.accidentalShown) continue;
          const current = inEffect.get(note.line);
          // 同じ位置の別の声部には、それぞれに臨時記号を書くのが慣習
          if (current?.alter === alter && current.tick < chord.tick) {
            report({
              at: { staff, measure: chord.measure, tick: chord.tick },
              message: `${tpcToName(note.tpc)} の臨時記号は同じ小節で既に有効です`,
              detail: { line: note.line, alter, previousTick: current.tick },
            });
          }
          inEffect.set(note.line, { alter, tick: chord.tick });
        }
      }
    }
  },
});

/**
 * 調号から五度圏でこれより離れた綴りは、異名同音で書いたほうが読みやすい。5 にすると、
 * ホ長調の B#（導音）は範囲に入り、ハ長調の B#・Cb は外れる。
 */
const SPELLING_REACH = 5;

const keyLabel = (fifths: number): string =>
  fifths === 0 ? "調号なし" : fifths > 0 ? `シャープ ${fifths} つ` : `フラット ${-fifths} つ`;

export const extremeSpelling = defineRule({
  id: "extreme-spelling",
  meta: {
    name: "調から遠い綴り",
    description: "調号から遠い綴り（ハ長調の B#・Cb・重嬰・重変など）を検出",
    category: "notation",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff } of score.staves) {
      const seen = new Set<string>();
      for (const { chord } of chordsInOrder(score, [staff])) {
        const key = keyAt(score, staff, chord.tick);
        if (key === null) continue;
        // 調の幹音は tpc で 13+key（F の位置）から 19+key（B の位置）に並ぶ
        const low = 13 + key - SPELLING_REACH;
        const high = 19 + key + SPELLING_REACH;
        for (const note of chord.notes) {
          if (note.tpc >= low && note.tpc <= high) continue;
          const dedupe = `${chord.measure}:${note.tpc}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);
          report({
            at: { staff, measure: chord.measure, tick: chord.tick },
            message: `${tpcToName(note.tpc)} は調号（${keyLabel(key)}）から遠い綴りです。異名同音で書くと読みやすくなります`,
            detail: { tpc: note.tpc, fifths: key },
          });
        }
      }
    }
  },
});

export const keySignature = defineRule({
  id: "key-signature",
  meta: {
    name: "調号の書き方",
    description: "7 つの調号と、前と同じ調号への変更を検出",
    category: "notation",
    severity: "info",
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    for (const { index: staff, keySignatures } of score.staves) {
      let previous: number | null = null;
      for (const key of keySignatures) {
        const at = { staff, measure: key.measure, tick: key.tick };
        if (Math.abs(key.fifths) >= 7) {
          report({
            at,
            message: `調号が${keyLabel(key.fifths)}です。異名同音の調（${keyLabel(key.fifths > 0 ? key.fifths - 12 : key.fifths + 12)}）で書くと読みやすくなります`,
            detail: { fifths: key.fifths },
          });
        }
        if (previous === key.fifths) {
          report({
            at,
            message: "前と同じ調号に変更しています",
            detail: { fifths: key.fifths },
          });
        }
        previous = key.fifths;
      }
    }
  },
});
