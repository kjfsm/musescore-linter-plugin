import { stableSortBy } from "./sort.ts";
import type {
  Annotation,
  Chord,
  Hairpin,
  Measure,
  Part,
  Score,
  Slur,
  Tie,
  VoiceEvent,
} from "./types.ts";

// 結果は Score ごとに覚えておく。Score は組み立てたあと書き換えない前提で、
// 書き換えると古い結果が返る。

function memoize<T>(build: (score: Score) => T): (score: Score) => T {
  const cache = new WeakMap<Score, T>();
  return (score) => {
    let value = cache.get(score);
    if (value === undefined) {
      value = build(score);
      cache.set(score, value);
    }
    return value;
  };
}

/** `key` ごとに `build` を 1 回だけ呼ぶ。譜表ごと・小節ごとの結果を、使われた分だけ作る。 */
function memoizeByKey<K, T>(build: (score: Score, key: K) => T): (score: Score, key: K) => T {
  const caches = memoize(() => new Map<K, T>());
  return (score, key) => {
    const cache = caches(score);
    let value = cache.get(key);
    if (value === undefined) {
      value = build(score, key);
      cache.set(key, value);
    }
    return value;
  };
}

const partById = memoize((score) => {
  const map = new Map<string, Part>();
  for (const part of score.parts) map.set(part.id, part);
  return map;
});

export function partOfStaff(score: Score, staff: number): Part | null {
  const partId = score.staves[staff]?.partId;
  return partId === undefined ? null : (partById(score).get(partId) ?? null);
}

/** `startOf` 昇順の items のうち、`startOf(item) <= tick` を満たす最後の添字。無ければ -1。 */
function lastIndexStartingBy<T>(
  items: readonly T[],
  startOf: (item: T) => number,
  tick: number,
): number {
  let lo = 0;
  let hi = items.length - 1;
  let last = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (startOf(items[mid]!) <= tick) {
      last = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return last;
}

/** tick を含む小節。小節の範囲外（先頭より前）なら null。 */
export function measureAt(score: Score, tick: number): Measure | null {
  return score.measures[lastIndexStartingBy(score.measures, (m) => m.startTick, tick)] ?? null;
}

export function measureBySerial(score: Score, serial: number): Measure | null {
  return score.measures[serial - 1] ?? null;
}

/** 譜表のすべての和音。声部の順、声部の中は tick 昇順。 */
export const chordsOnStaff = memoizeByKey((score: Score, staff: number): Chord[] => {
  const out: Chord[] = [];
  for (const voice of score.staves[staff]?.voices ?? []) {
    for (const event of voice.events) if (event.type === "chord") out.push(event);
  }
  return out;
});

const eventsByMeasure = memoizeByKey((score: Score, key: string) => {
  const [staff, voice] = key.split(":").map(Number) as [number, number];
  const map = new Map<number, VoiceEvent[]>();
  for (const event of score.staves[staff]?.voices[voice]?.events ?? []) {
    const list = map.get(event.measure);
    if (list) list.push(event);
    else map.set(event.measure, [event]);
  }
  return map;
});

/** 声部の、ある小節の音符と休符。tick 昇順。 */
export function voiceEventsIn(
  score: Score,
  staff: number,
  voice: number,
  measure: number,
): readonly VoiceEvent[] {
  return eventsByMeasure(score, `${staff}:${voice}`).get(measure) ?? [];
}

const chordsByMeasure = memoizeByKey((score: Score, key: string) => {
  const map = new Map<number, Chord[]>();
  for (const [measure, events] of eventsByMeasure(score, key)) {
    map.set(
      measure,
      events.filter((e): e is Chord => e.type === "chord"),
    );
  }
  return map;
});

export function chordsIn(
  score: Score,
  staff: number,
  voice: number,
  measure: number,
): readonly Chord[] {
  return chordsByMeasure(score, `${staff}:${voice}`).get(measure) ?? [];
}

const rhythms = memoizeByKey((score: Score, key: string) => {
  const map = new Map<number, string>();
  for (const [measure, events] of eventsByMeasure(score, key)) {
    map.set(
      measure,
      events
        .map(
          (e) =>
            `${e.tick}/${e.duration?.numerator ?? 0}/${e.duration?.denominator ?? 0}/${e.type}`,
        )
        .join(","),
    );
  }
  return map;
});

/**
 * 声部の、ある小節のリズムを 1 つの文字列にしたもの。同じ文字列なら同じリズム。
 * 音符も休符も無ければ undefined。
 */
export function rhythmSignature(
  score: Score,
  staff: number,
  voice: number,
  measure: number,
): string | undefined {
  return rhythms(score, `${staff}:${voice}`).get(measure);
}

/** 譜表で最初に鳴る和音。同じ tick なら小節の若いほう。 */
export const firstChord = memoizeByKey((score: Score, staff: number): Chord | null => {
  let first: Chord | null = null;
  for (const chord of chordsOnStaff(score, staff)) {
    if (
      !first ||
      chord.tick < first.tick ||
      (chord.tick === first.tick && chord.measure < first.measure)
    ) {
      first = chord;
    }
  }
  return first;
});

/** 譜表で最初の音符か休符の tick。どちらも無ければ null。 */
export const firstEventTick = memoizeByKey((score: Score, staff: number): number | null => {
  let first: number | null = null;
  for (const voice of score.staves[staff]?.voices ?? []) {
    const head = voice.events[0];
    if (head && (first === null || head.tick < first)) first = head.tick;
  }
  return first;
});

function ticksOf(score: Score, staff: number, type: VoiceEvent["type"]): Set<number> {
  const ticks = new Set<number>();
  for (const voice of score.staves[staff]?.voices ?? []) {
    for (const event of voice.events) if (event.type === type) ticks.add(event.tick);
  }
  return ticks;
}

export const restTicks = memoizeByKey((score: Score, staff: number) =>
  ticksOf(score, staff, "rest"),
);

export const chordTicks = memoizeByKey((score: Score, staff: number) =>
  ticksOf(score, staff, "chord"),
);

/** 楽譜の中で最も後ろにある要素（音符・休符・小節線・注記）の tick。 */
export const lastTick = memoize((score: Score): number => {
  let last = 0;
  for (const staff of score.staves) {
    for (const voice of staff.voices) {
      const tail = voice.events[voice.events.length - 1];
      if (tail && tail.tick > last) last = tail.tick;
    }
    const bar = staff.barlines[staff.barlines.length - 1];
    if (bar && bar.tick > last) last = bar.tick;
  }
  for (const a of score.annotations) if (a.tick > last) last = a.tick;
  return last;
});

/** 音符か休符がある最後の小節の通し番号。どちらも無ければ 0。 */
export const lastEventMeasure = memoize((score: Score): number => {
  let last = 0;
  for (const staff of score.staves) {
    for (const voice of staff.voices) {
      const tail = voice.events[voice.events.length - 1];
      if (tail && tail.measure > last) last = tail.measure;
    }
  }
  return last;
});

const annotationsByStaff = memoize((score: Score) => {
  const own = score.staves.map((): Annotation[] => []);
  const affecting = score.staves.map((): Annotation[] => []);
  for (const a of score.annotations) {
    const scope = a.scope;
    if (scope.type === "staff") {
      own[scope.staff]?.push(a);
      affecting[scope.staff]?.push(a);
    } else if (scope.type === "part") {
      for (const staff of partById(score).get(scope.partId)?.staves ?? []) {
        own[staff]?.push(a);
        affecting[staff]?.push(a);
      }
    } else {
      for (const list of affecting) list.push(a);
    }
  }
  return { own, affecting };
});

/** 譜表に付いた注記（その譜表のパートに付いたものを含む）。読み込み順。 */
export function annotationsOn(score: Score, staff: number): readonly Annotation[] {
  return annotationsByStaff(score).own[staff] ?? [];
}

/** 譜表に効く注記。{@link annotationsOn} に楽譜全体に付いた注記を加える。読み込み順。 */
export function annotationsAffecting(score: Score, staff: number): readonly Annotation[] {
  return annotationsByStaff(score).affecting[staff] ?? [];
}

function groupByStaff<S extends { staff: number; startTick: number }>(
  score: Score,
  spans: readonly S[],
): S[][] {
  const out = score.staves.map((): S[] => []);
  for (const span of spans) out[span.staff]?.push(span);
  return out.map((list) => stableSortBy(list, (a, b) => a.startTick - b.startTick));
}

const slursByStaff = memoize((score: Score) => groupByStaff(score, score.slurs));
const tiesByStaff = memoize((score: Score) => groupByStaff(score, score.ties));
const hairpinsByStaff = memoize((score: Score) => groupByStaff(score, score.hairpins));

/** startTick 昇順。 */
export function slursOn(score: Score, staff: number): readonly Slur[] {
  return slursByStaff(score)[staff] ?? [];
}

/** startTick 昇順。 */
export function tiesOn(score: Score, staff: number): readonly Tie[] {
  return tiesByStaff(score)[staff] ?? [];
}

/** startTick 昇順。 */
export function hairpinsOn(score: Score, staff: number): readonly Hairpin[] {
  return hairpinsByStaff(score)[staff] ?? [];
}

/**
 * startTick 昇順のスパナーのうち、voice の tick を覆う（`startTick <= tick < endTick`）ものがあるか。
 *
 * 二分探索で「startTick <= tick」の最後まで飛び、そこから手前へ endTick を見る。
 * 覆うものが見つかればそこで止まるが、見つからなければ先頭まで戻る（最悪で全件）。
 */
export function spanCovers(
  spans: readonly { voice: number; startTick: number; endTick: number }[],
  voice: number,
  tick: number,
): boolean {
  for (let i = lastIndexStartingBy(spans, (s) => s.startTick, tick); i >= 0; i--) {
    const s = spans[i]!;
    if (s.voice === voice && tick < s.endTick) return true;
  }
  return false;
}

/** 譜表で tick の位置に効いている調号のシャープの数（フラットは負）。調号が無ければ null。 */
export function keyAt(score: Score, staff: number, tick: number): number | null {
  const keys = score.staves[staff]?.keySignatures ?? [];
  return keys[lastIndexStartingBy(keys, (k) => k.tick, tick)]?.fifths ?? null;
}
