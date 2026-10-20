import type { LintIR, TextKind } from "@musescore-linter/core";
import { CANONICAL, eventsOnStaff } from "@musescore-linter/core";

export function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.includes(text);
}

// ─── テキストを載せる kind の集合 ───────────────────────────────────────────
//
// 「どの kind がテキストか」の答えが checker ごとにバラバラだったのを 1 箇所に集めた。
// 実際に取りこぼしが起きていた: coda-segno は EXPRESSION を見ておらず、MuseScore で
// Expression 要素として書いた「Coda」を検出できなかった。rest-annotation は逆に
// SYSTEM_TEXT を見ていなかった。
//
// MusicXML 経路は要素の種別を持たないので、この 4 種はすべて STAFF_TEXT に落ちる。
// 集合で判定しているかぎりソースによる差は出ないが、集合から STAFF_TEXT を落とすと
// MusicXML 経路が丸ごと空振りする。新しい checker を書くときはここの関数を使うこと。

const K = CANONICAL.elementKinds;

/** 人が書いた自由テキスト。テンポ表記を含む。 */
export const PROSE_TEXT_KINDS: readonly TextKind[] = [
  K.TEMPO_TEXT,
  K.STAFF_TEXT,
  K.SYSTEM_TEXT,
  K.EXPRESSION,
];

/**
 * 奏法・表情を指示する自由テキスト。テンポ表記は含まない。
 * 「休符に載っていたらおかしい注記」「反復記号のテキスト」のように、
 * テンポ表記を対象に含めると誤検出になる用途で使う。
 */
export const TECHNIQUE_TEXT_KINDS: readonly TextKind[] = [
  K.STAFF_TEXT,
  K.SYSTEM_TEXT,
  K.EXPRESSION,
];

/** 譜面に貼り付く注記すべて（自由テキスト + リハーサルマーク + 強弱記号）。 */
export const ANNOTATION_KINDS: readonly TextKind[] = [
  ...PROSE_TEXT_KINDS,
  K.REHEARSAL_MARK,
  K.DYNAMIC,
];

export interface PartBucketEvent {
  text: string;
  rawText: string;
  tick: number;
  measure: number;
  staffIdx: number;
}

export interface PartBucket {
  partName: string;
  staffIdx: number;
  events: PartBucketEvent[];
}

export function buildPartBuckets(ir: LintIR): PartBucket[] {
  const buckets = new Map<string, PartBucket>();
  const metaParts = ir.meta.parts;

  for (const part of metaParts) {
    const { staffIdx, partId } = part;
    let bucket = buckets.get(partId);
    if (!bucket) {
      bucket = { partName: part.partName || `Staff ${staffIdx + 1}`, staffIdx, events: [] };
      buckets.set(partId, bucket);
    } else if (staffIdx < bucket.staffIdx) {
      bucket.staffIdx = staffIdx;
    }

    for (const kind of ANNOTATION_KINDS) {
      for (const ev of eventsOnStaff(ir, staffIdx, kind)) {
        bucket.events.push({
          text: ev.textNorm,
          rawText: ev.textRaw,
          tick: ev.tick,
          measure: ev.measure,
          staffIdx: ev.staffIdx,
        });
      }
    }
  }

  return [...buckets.values()]
    .map((bucket) => {
      bucket.events.sort((a, b) => {
        if (a.measure !== b.measure) return a.measure - b.measure;
        if (a.tick !== b.tick) return a.tick - b.tick;
        if (a.text !== b.text) return a.text < b.text ? -1 : 1;
        return a.staffIdx - b.staffIdx;
      });

      const seen = new Set<string>();
      bucket.events = bucket.events.filter((ev) => {
        const key = `${ev.tick}|${ev.text}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return bucket;
    })
    .sort((a, b) => a.staffIdx - b.staffIdx);
}
