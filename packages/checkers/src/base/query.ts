import type { ChordEvent, ElementKind, EventOfKind, IndexedIR, LintIR } from "@score-linter/core";
import { eventsAtTick, eventsOnStaff } from "@score-linter/core";

/**
 * tick を含む小節の番号。求まらなければ 0。
 *
 * `ir.meta.measures` は startTick 昇順なので二分探索する。以前は
 * `ir.index.byTick[tick]` を引いていたが、その tick にイベントが 1 つも無いと
 * 0 を返していた（ヘアピンの終端など、音符の無い位置を指すケースがある）。
 * measure 0 の issue は compareIssues の並びで先頭に来るので、ユーザーには
 * 「小節 0 の謎の指摘が一番上に出る」と見えていた。
 */
export function measureAtTick(ir: LintIR, tick: number): number {
  const { measures } = ir.meta;
  const found = measures[lastIndexStartingBy(measures, (m) => m.startTick, tick)];
  if (found) return found.measure;

  // measures を持たない IR（テストの最小 fixture や、小節情報を作らない
  // 入力ソース）向けのフォールバック。
  return eventsAtTick(ir, tick).find((ev) => ev.measure > 0)?.measure ?? 0;
}

/** `startOf` 昇順に並んだ items のうち、`startOf(item) <= tick` を満たす最後の添字。無ければ -1。 */
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

/**
 * その譜表に効く kind のイベント。global scope（`staffIdx === -1`、全パート共通の注記）も含める。
 *
 * MuseScore 経路は全体に効く注記を `staffIdx: -1` に置くが、MusicXML 経路には
 * それに相当する表現が無く、同じ注記が譜表に載る。checker はどちらのソースから来た IR かを
 * 知らないので、両方から集めないとソースによって検出したりしなかったりする。
 */
export function eventsForStaff<K extends ElementKind>(
  ir: LintIR,
  staffIdx: number,
  kind: K,
): EventOfKind<K>[] {
  const onStaff = eventsOnStaff(ir, staffIdx, kind);
  return staffIdx === -1 ? onStaff : [...onStaff, ...eventsOnStaff(ir, -1, kind)];
}

/** staffIdx → partName のマップ。ir.meta.parts から構築する。 */
export function buildPartNameMap(ir: LintIR): Map<number, string> {
  const map = new Map<number, string>();
  for (const part of ir.meta.parts) {
    map.set(part.staffIdx, part.partName);
  }
  return map;
}

/**
 * (staff, measure, voice) の chord イベントを tick 昇順で返す。返り値は ir.derived が持つ
 * 配列そのものなので、呼び出し側で書き換えてはいけない。
 *
 * withDerived が事前に索引を作る。小節ごとに呼ばれると staff 全体の chord を毎回
 * filter + sort することになり、実測でこの経路だけがチェッカー全体の 8 割を占めていた。
 */
export function chordsIn(
  ir: IndexedIR,
  staffIdx: number,
  measure: number,
  voice: number,
): readonly ChordEvent[] {
  return ir.derived.chordsByStaffMeasure[`${staffIdx}:${measure}:${voice}`] ?? [];
}

/** (staff, measure, voice) のリズム署名。無ければ undefined。 */
export function rhythmSignature(
  ir: IndexedIR,
  staffIdx: number,
  measure: number,
  voice: number,
): string | undefined {
  return ir.derived.rhythmByStaffMeasure[`${staffIdx}:${measure}:${voice}`];
}

/** chord イベントに付いたアーティキュレーション名（無ければ []）。 */
export function articulationsOf(ir: IndexedIR, chordId: number): readonly string[] {
  return ir.derived.articulationsByChordId[chordId] ?? [];
}

/**
 * MuseScore の subtypeName() は符尾方向により「上スタッカート」「下スタッカート」等の
 * 配置違いバリアントを返すが、音楽的には同一の記号なので比較時は接頭辞を除去して同一視する。
 */
export function normalizeArticulationName(name: string): string {
  return name.replace(/^[上下]/, "");
}

/** startTick 昇順のスパナ列。derived が startTick でソートして持っている。 */
interface Span {
  voice: number;
  startTick: number;
  endTick: number;
}

/**
 * tick を覆うスパナがあるか。
 *
 * `slursByStaff` / `tiesByStaff` は withDerived が startTick 昇順にソートして
 * 持っているので、二分探索で「startTick <= tick」の最後の位置まで飛べる。そこから
 * 手前へ戻りながら endTick を見る。全件 some していた頃は、最も重い checker
 * （slur-tie-articulation-consistency）の内側から chord ごとに 2 回呼ばれていた。
 *
 * 手前へ戻る幅は「まだ閉じていないスパナの数」で、実際の楽譜では同時に開いている
 * スラー/タイはごく少数なので、実質は定数回で止まる。
 */
function spanCoversTick(spans: readonly Span[], voice: number, tick: number): boolean {
  for (let i = lastIndexStartingBy(spans, (s) => s.startTick, tick); i >= 0; i--) {
    const s = spans[i]!;
    if (s.voice === voice && tick < s.endTick) return true;
  }
  return false;
}

/** tick が staff/voice のスラーに含まれるか。 */
export function slurCoversTick(
  ir: IndexedIR,
  staffIdx: number,
  voice: number,
  tick: number,
): boolean {
  return spanCoversTick(ir.derived.slursByStaff[staffIdx] ?? [], voice, tick);
}

/** tick が staff/voice のタイに含まれるか。 */
export function tieCoversTick(
  ir: IndexedIR,
  staffIdx: number,
  voice: number,
  tick: number,
): boolean {
  return spanCoversTick(ir.derived.tiesByStaff[staffIdx] ?? [], voice, tick);
}

/**
 * measure/voice で同じリズム署名を持つ staffIdx のグループ（サイズ >= 2）を返す。
 *
 * `groupKeyOf` を渡すと、同じリズムでも別グループの譜表は同じバケツに入らなくなる
 * （`null` を返した譜表は列挙から外れる）。省略時は全パート横断。
 *
 * バケツを `groupKey → sig` の 2 段にしているのは意図的で、`` `${gk}:${sig}` `` の連結キーに
 * してはいけない。リズム署名は小節内の全音符を連結した文字列（16 分主体の小節では数百文字）で、
 * 連結すると「パート数 × 小節数」回そのコピーとハッシュが走る。
 */
export function staffGroupsSharingRhythm(
  ir: IndexedIR,
  measure: number,
  voice: number,
  groupKeyOf?: (staffIdx: number) => string | null,
): number[][] {
  const byGroup = new Map<string, Map<string, number[]>>();
  for (const part of ir.meta.parts) {
    const groupKey = groupKeyOf ? groupKeyOf(part.staffIdx) : "";
    if (groupKey === null) continue;
    const sig = rhythmSignature(ir, part.staffIdx, measure, voice);
    if (!sig) continue;
    let bySig = byGroup.get(groupKey);
    if (!bySig) {
      bySig = new Map();
      byGroup.set(groupKey, bySig);
    }
    const bucket = bySig.get(sig);
    if (bucket) bucket.push(part.staffIdx);
    else bySig.set(sig, [part.staffIdx]);
  }

  const out: number[][] = [];
  for (const bySig of byGroup.values()) {
    for (const group of bySig.values()) {
      if (group.length >= 2) out.push(group.sort((a, b) => a - b));
    }
  }
  return out;
}
