import { stableSortBy } from "@score-linter/score-model";

import { defineRule } from "../engine.ts";
import { directiveOf, ofKind } from "./support/common.ts";

/**
 * Z の後を AA, BB, CC… と続ける譜面も、この順位なら昇順になる。繰り返し表記に別の番号を振ると、
 * AB と BB のように 2 つの数え方で番号が衝突する（#147）。
 */
function rehearsalRank(label: string): number | null {
  const t = label.trim();
  if (t.length === 0) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const up = t.toUpperCase();
  if (!/^[A-Z]+$/.test(up)) return null;
  let n = 0;
  for (const c of up) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

export const rehearsalMarkOrder = defineRule({
  id: "rehearsal-mark-order",
  meta: {
    name: "リハーサルマークの順序",
    description: "リハーサルマークの順序の乱れ・重複を検出",
    category: "notation",
    severity: "info",
    tier: "recommended",
    docs: "リハーサルマークの順序逆転・重複",
  },
  options: {},
  messages: {
    duplicate: "リハーサルマーク「{label}」が重複しています",
    reversed: "リハーサルマークの順序が逆転しています（「{previous}」の後に「{label}」）",
  },
  examples: {
    invalid: [
      {
        score: {
          chords: [{ tick: 0 }],
          annotations: [
            { tick: 0, measure: 1, text: "B", kind: "rehearsal" },
            { tick: 480, measure: 2, text: "A", kind: "rehearsal" },
          ],
        },
      },
    ],
    valid: [
      {
        score: {
          chords: [{ tick: 0 }],
          annotations: [
            { tick: 0, measure: 1, text: "A", kind: "rehearsal" },
            { tick: 480, measure: 2, text: "B", kind: "rehearsal" },
          ],
        },
      },
    ],
  },
  run({ score, report }) {
    // 同じマークが複数の譜表に同じ tick で現れることがある
    const seenAt = new Set<string>();
    const marks = stableSortBy(ofKind(score.annotations, "rehearsal"), (a, b) => a.tick - b.tick)
      .map((a) => ({ a, label: directiveOf(a, "rehearsal")?.label ?? a.text.trim() }))
      .filter(({ a, label }) => {
        if (label.length === 0) return false;
        const key = `${a.tick}|${label.toLowerCase()}`;
        if (seenAt.has(key)) return false;
        seenAt.add(key);
        return true;
      });

    const seen = new Set<string>();
    let lastRank: number | null = null;
    let lastLabel = "";
    for (const { a, label } of marks) {
      const at = { measure: a.measure, tick: a.tick };
      if (seen.has(label.toLowerCase())) {
        // 重複は重複として報告し、順序の判定には使わない
        report({ at, messageId: "duplicate", data: { label }, detail: { label } });
        continue;
      }
      seen.add(label.toLowerCase());
      const rank = rehearsalRank(label);
      if (rank !== null && lastRank !== null && rank <= lastRank) {
        report({
          at,
          messageId: "reversed",
          data: { previous: lastLabel, label },
          detail: { previous: lastLabel, current: label },
        });
      }
      if (rank !== null) {
        lastRank = rank;
        lastLabel = label;
      }
    }
  },
});
