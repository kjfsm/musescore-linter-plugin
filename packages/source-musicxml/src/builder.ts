import type {
  EventSpec,
  HairpinSpec,
  LintIR,
  MeasureInfo,
  NoteInfo,
  PartGroupInfo,
  PartSpec,
  SlurSpec,
  TieSpec,
} from "@musescore-linter/core";
import { buildIR, CANONICAL, TICKS_PER_QUARTER } from "@musescore-linter/core";

import { articulationNameOf } from "./articulations.js";
import { durationFromDivisions, durationFromType, type Fraction } from "./duration.js";
import { readPartGroupDrafts, resolvePartGroups, type StaffRange } from "./partGroups.js";
import {
  type ClefState,
  clefFrom,
  DEFAULT_CLEF,
  toMidiPitch,
  toStaffLine,
  toTpc,
} from "./pitch.js";
import {
  attr,
  child,
  childNumber,
  childrenNamed,
  childrenOf,
  childText,
  find,
  hasChild,
  parseXml,
  tagOf,
  textOf,
  type XNode,
} from "./xml.js";

// MuseScore 経路と tick の尺度を揃えるため、四分音符 = 480 tick に正規化する。
// 実体は core（両ソースが同じ尺度を共有する必要があるため）。既存の公開 API を保つため再輸出する。
export { TICKS_PER_QUARTER };

const K = CANONICAL.elementKinds;
const BK = CANONICAL.barlineKinds;

/**
 * 小節内の相対位置で保持しておき、全パートの走査後に絶対 tick へ変換する。
 * 小節の長さは全パートを見終わるまで確定しないため、小節末に置く要素（右小節線）は
 * `atMeasureEnd` で印を付けて解決を遅らせる。
 */
interface Placed {
  measureIdx: number;
  localTick: number;
  atMeasureEnd?: boolean;
}

type EventDraft = Omit<EventSpec, "tick" | "measure">;

interface PendingEvent extends Placed {
  value: EventDraft;
}

interface SpanDraft {
  staffIdx: number;
  voice: number;
  start: Placed;
  end: Placed;
  startPitch: number | null;
  endPitch: number | null;
}

interface TimeSig {
  n: number;
  d: number;
}

interface ScoreDraft {
  parts: PartSpec[];
  partGroups: PartGroupInfo[];
  events: PendingEvent[];
  /** measureIdx → その小節の長さ（tick）。全パートの最大値を採る。 */
  measureLengths: number[];
  /** measureIdx → その小節の拍子。最初に見つけたパートの値を採る。取れない小節は空き。 */
  timeSigs: (TimeSig | undefined)[];
  hairpins: SpanDraft[];
  slurs: SpanDraft[];
  ties: SpanDraft[];
}

function numberOr(node: XNode, tag: string, fallback: number): number {
  const n = childNumber(node, tag);
  return n === undefined ? fallback : n;
}

/** `<metronome>` の beat-unit を四分音符 1 としたときの倍率。 */
const BEAT_UNIT_FACTOR: Record<string, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  "16th": 0.25,
  "32nd": 0.125,
};

function metronomeBpm(metronome: XNode): number | null {
  const unit = childText(metronome, "beat-unit");
  const perMinute = childNumber(metronome, "per-minute");
  if (unit === undefined || perMinute === undefined) return null;
  const factor = BEAT_UNIT_FACTOR[unit];
  if (factor === undefined) return null;
  const dotted = hasChild(metronome, "beat-unit-dot") ? 1.5 : 1;
  return perMinute * factor * dotted;
}

function metronomeText(metronome: XNode): string {
  const unit = childText(metronome, "beat-unit") ?? "";
  const perMinute = childText(metronome, "per-minute") ?? "";
  const dot = hasChild(metronome, "beat-unit-dot") ? "." : "";
  return `${unit}${dot} = ${perMinute}`.trim();
}

/**
 * `<barline>` の bar-style と repeat から canonical な barlineKind を決める。
 * repeat が付いていれば bar-style より優先する。
 */
function barlineKindOf(barline: XNode): string {
  const directions = new Set(
    childrenNamed(barline, "repeat")
      .map((r) => attr(r, "direction") ?? "")
      .filter(Boolean),
  );
  if (directions.has("forward") && directions.has("backward")) {
    return BK.REPEAT_BOTH;
  }
  if (directions.has("forward")) return BK.REPEAT_START;
  if (directions.has("backward")) return BK.REPEAT_END;

  switch (childText(barline, "bar-style")) {
    case "light-heavy":
    case "heavy":
      return BK.FINAL;
    case "light-light":
    case "heavy-heavy":
      return BK.DOUBLE;
    case "heavy-light":
      return BK.REPEAT_START;
    case undefined:
      return BK.UNKNOWN;
    default:
      return BK.OTHER;
  }
}

/** MusicXML の `<voice>` 文字列を、譜表ごとに 0-3 の voice 番号へ割り当てる。 */
class VoiceAssigner {
  private readonly byStaff = new Map<number, Map<string, number>>();

  resolve(staffIdx: number, voice: string | undefined): number {
    if (voice === undefined || voice === "") return 0;
    let map = this.byStaff.get(staffIdx);
    if (!map) {
      map = new Map();
      this.byStaff.set(staffIdx, map);
    }
    const known = map.get(voice);
    if (known !== undefined) return known;
    const assigned = Math.min(map.size, 3);
    map.set(voice, assigned);
    return assigned;
  }
}

interface PartContext {
  staffOffset: number;
  staffCount: number;
}

/** `<part-list>` から partId → part-name を得る。 */
function readPartNames(partList: XNode | undefined): Map<string, string> {
  const names = new Map<string, string>();
  if (!partList) return names;
  for (const sp of childrenNamed(partList, "score-part")) {
    const id = attr(sp, "id");
    if (!id) continue;
    names.set(id, childText(sp, "part-name") ?? "");
  }
  return names;
}

/** その `<part>` が使う譜表数（`<attributes><staves>` の最大値。既定 1）。 */
function countStaves(partNode: XNode): number {
  let staves = 1;
  for (const measure of childrenNamed(partNode, "measure")) {
    for (const attrsNode of childrenNamed(measure, "attributes")) {
      const n = childNumber(attrsNode, "staves");
      if (n !== undefined && n > staves) staves = n;
    }
  }
  return staves;
}

/**
 * `<time>` を n/m として読む。読めない・単純な分数で表せないものは undefined を返し、
 * その小節は拍子なしとして扱う（拍位置を使う checker は黙ってスキップする）。
 * 複数の `<beats>` を持つ加算拍子（3+2/8 等）と `<senza-misura>` はここで落ちる。
 */
function readTimeSig(time: XNode): TimeSig | undefined {
  const beats = childrenNamed(time, "beats");
  const beatTypes = childrenNamed(time, "beat-type");
  if (beats.length !== 1 || beatTypes.length !== 1) return undefined;

  const n = childNumber(time, "beats");
  const d = childNumber(time, "beat-type");
  if (n === undefined || d === undefined) return undefined;
  if (!Number.isInteger(n) || !Number.isInteger(d) || n <= 0 || d <= 0) return undefined;
  return { n, d };
}

class PartWalker {
  private divisions = 1;
  /** `<time>` は変更時のみ現れるので、次の変更まで持ち回る。 */
  private timeSig: TimeSig | undefined;
  private cursor = 0;
  private measureIdx = 0;
  private chordAnchorTick = 0;
  private currentChord: PendingEvent | null = null;
  private readonly clefs = new Map<number, ClefState>();
  private readonly voices = new VoiceAssigner();
  private readonly openTies = new Map<string, SpanDraft>();
  private readonly openSlurs = new Map<string, SpanDraft>();
  private readonly openWedges = new Map<string, SpanDraft>();

  constructor(
    private readonly ctx: PartContext,
    private readonly draft: ScoreDraft,
  ) {}

  private toTicks(divisionUnits: number): number {
    return Math.round((divisionUnits * TICKS_PER_QUARTER) / this.divisions);
  }

  private staffIdxOf(staffNumber: number): number {
    const clamped = Math.min(Math.max(staffNumber, 1), Math.max(this.ctx.staffCount, 1));
    return this.ctx.staffOffset + clamped - 1;
  }

  private here(localTick: number): Placed {
    return { measureIdx: this.measureIdx, localTick };
  }

  private push(localTick: number, value: EventDraft): PendingEvent {
    const pending: PendingEvent = {
      measureIdx: this.measureIdx,
      localTick,
      value,
    };
    this.draft.events.push(pending);
    return pending;
  }

  private growMeasure(): void {
    const current = this.draft.measureLengths[this.measureIdx] ?? 0;
    if (this.cursor > current) {
      this.draft.measureLengths[this.measureIdx] = this.cursor;
    }
  }

  walk(partNode: XNode): void {
    const measures = childrenNamed(partNode, "measure");
    for (let i = 0; i < measures.length; i++) {
      this.measureIdx = i;
      this.cursor = 0;
      this.chordAnchorTick = 0;
      this.currentChord = null;
      if (this.draft.measureLengths[i] === undefined) {
        this.draft.measureLengths[i] = 0;
      }
      for (const node of childrenOf(measures[i])) {
        this.handleMeasureChild(node);
      }
      this.growMeasure();
      if (this.timeSig !== undefined && this.draft.timeSigs[i] === undefined) {
        this.draft.timeSigs[i] = this.timeSig;
      }
    }
  }

  private handleMeasureChild(node: XNode): void {
    switch (tagOf(node)) {
      case "attributes":
        this.handleAttributes(node);
        break;
      case "note":
        this.handleNote(node);
        break;
      case "backup":
        this.cursor = Math.max(0, this.cursor - this.toTicks(numberOr(node, "duration", 0)));
        this.currentChord = null;
        break;
      case "forward":
        this.cursor += this.toTicks(numberOr(node, "duration", 0));
        this.growMeasure();
        this.currentChord = null;
        break;
      case "direction":
        this.handleDirection(node);
        break;
      case "barline":
        this.handleBarline(node);
        break;
      default:
        break;
    }
  }

  private handleAttributes(node: XNode): void {
    const divisions = childNumber(node, "divisions");
    if (divisions !== undefined && divisions > 0) this.divisions = divisions;

    for (const time of childrenNamed(node, "time")) {
      this.timeSig = readTimeSig(time);
    }

    for (const clef of childrenNamed(node, "clef")) {
      const staffNumber = Number(attr(clef, "number") ?? "1");
      this.clefs.set(
        Number.isFinite(staffNumber) ? staffNumber : 1,
        clefFrom(
          childText(clef, "sign") ?? "G",
          childNumber(clef, "line"),
          childNumber(clef, "clef-octave-change"),
        ),
      );
    }
  }

  private handleNote(node: XNode): void {
    // グレースノートは拍位置を持たないので LintIR に含めない（snapshot.ts と同じ方針）
    if (hasChild(node, "grace")) return;

    const isChordNote = hasChild(node, "chord");
    const staffNumber = numberOr(node, "staff", 1);
    const staffIdx = this.staffIdxOf(staffNumber);
    const voice = this.voices.resolve(staffIdx, childText(node, "voice"));

    const durationUnits = childNumber(node, "duration") ?? 0;
    const startTick = isChordNote ? this.chordAnchorTick : this.cursor;
    if (!isChordNote) {
      this.chordAnchorTick = this.cursor;
      this.cursor += this.toTicks(durationUnits);
      this.growMeasure();
    }

    const duration = this.resolveDuration(node, durationUnits);
    // <time-modification> があれば連符ブラケット内。3連符等はこれで一意に判別できる
    // （音価の分母だけでは 4:3 のような 2 の冪になる連符を見分けられない）。
    const tuplet = hasChild(node, "time-modification");

    if (hasChild(node, "rest")) {
      this.currentChord = null;
      this.push(startTick, {
        kind: K.REST,
        staff: staffIdx,
        voice,
        ...(duration ? { duration } : {}),
        ...(tuplet ? { tuplet: true } : {}),
      });
      return;
    }

    const chord = this.resolveChordEvent(
      isChordNote,
      startTick,
      staffIdx,
      voice,
      duration,
      tuplet,
      node,
    );
    const info = this.readNoteInfo(node, staffNumber);
    if (info) chord.value.notes = [...(chord.value.notes ?? []), info];

    this.collectArticulations(node, chord);
    this.collectSlurs(node, staffIdx, voice, startTick);
    this.collectTies(node, staffIdx, voice, startTick, info?.pitch ?? null);
  }

  private resolveDuration(node: XNode, durationUnits: number): Fraction | undefined {
    const dots = childrenNamed(node, "dot").length;
    return (
      durationFromType(childText(node, "type"), dots) ??
      durationFromDivisions(durationUnits, this.divisions)
    );
  }

  private resolveChordEvent(
    isChordNote: boolean,
    startTick: number,
    staffIdx: number,
    voice: number,
    duration: Fraction | undefined,
    tuplet: boolean,
    node: XNode,
  ): PendingEvent {
    if (isChordNote && this.currentChord) return this.currentChord;

    const stem = childText(node, "stem");
    const chord = this.push(startTick, {
      kind: K.CHORD,
      staff: staffIdx,
      voice,
      ...(duration ? { duration } : {}),
      ...(tuplet ? { tuplet: true } : {}),
      ...(stem === "up" ? { stemDirection: 1 } : {}),
      ...(stem === "down" ? { stemDirection: 2 } : {}),
    });
    this.currentChord = chord;
    return chord;
  }

  private readNoteInfo(node: XNode, staffNumber: number): NoteInfo | null {
    const pitch = child(node, "pitch");
    if (!pitch) return null; // <unpitched> / <rest> は綴り情報を持たない
    const step = childText(pitch, "step") ?? "C";
    const alter = childNumber(pitch, "alter") ?? 0;
    const octave = childNumber(pitch, "octave") ?? 4;
    return {
      pitch: toMidiPitch(step, alter, octave),
      tpc: toTpc(step, alter),
      line: toStaffLine(this.clefs.get(staffNumber) ?? DEFAULT_CLEF, step, octave),
      accidentalShown: hasChild(node, "accidental"),
    };
  }

  private collectArticulations(node: XNode, chord: PendingEvent): void {
    const names = new Set(chord.value.articulations ?? []);
    for (const notations of childrenNamed(node, "notations")) {
      for (const group of childrenOf(notations)) {
        const groupTag = tagOf(group);
        if (groupTag === "fermata") {
          names.add("Fermata");
          continue;
        }
        if (groupTag !== "articulations" && groupTag !== "technical" && groupTag !== "ornaments") {
          continue;
        }
        for (const item of childrenOf(group)) {
          const name = articulationNameOf(tagOf(item));
          if (name) names.add(name);
        }
      }
    }
    if (names.size > 0) chord.value.articulations = [...names].sort();
  }

  private collectSlurs(node: XNode, staffIdx: number, voice: number, localTick: number): void {
    for (const notations of childrenNamed(node, "notations")) {
      for (const slur of childrenNamed(notations, "slur")) {
        const key = attr(slur, "number") ?? "1";
        const type = attr(slur, "type");
        if (type === "start") {
          this.openSlurs.set(key, {
            staffIdx,
            voice,
            start: this.here(localTick),
            end: this.here(localTick),
            startPitch: null,
            endPitch: null,
          });
        } else if (type === "stop") {
          const open = this.openSlurs.get(key);
          if (!open) continue;
          this.openSlurs.delete(key);
          open.end = this.here(localTick);
          this.draft.slurs.push(open);
        }
      }
    }
  }

  private collectTies(
    node: XNode,
    staffIdx: number,
    voice: number,
    localTick: number,
    pitch: number | null,
  ): void {
    for (const notations of childrenNamed(node, "notations")) {
      for (const tied of childrenNamed(notations, "tied")) {
        const type = attr(tied, "type");
        const key = `${staffIdx}:${voice}:${pitch ?? "?"}`;
        if (type === "start") {
          this.openTies.set(key, {
            staffIdx,
            voice,
            start: this.here(localTick),
            end: this.here(localTick),
            startPitch: pitch,
            endPitch: pitch,
          });
        } else if (type === "stop") {
          // 同一音高の開始が見つからない場合は、同じ staff/voice の開いているタイを
          // 拾う（異音程タイ = tie-pitch-mismatch が検出したい記譜ミスがこれに当たる）
          const exact = this.openTies.get(key);
          const openKey = exact ? key : this.findLooseTieKey(staffIdx, voice, pitch);
          if (openKey === undefined) continue;
          const open = this.openTies.get(openKey);
          if (!open) continue;
          this.openTies.delete(openKey);
          open.end = this.here(localTick);
          open.endPitch = pitch;
          this.draft.ties.push(open);
        }
      }
    }
  }

  /** 同じ staff/voice で開いているタイのうち、最も近い音高のものを選ぶ。 */
  private findLooseTieKey(
    staffIdx: number,
    voice: number,
    pitch: number | null,
  ): string | undefined {
    let bestKey: string | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [key, span] of this.openTies) {
      if (span.staffIdx !== staffIdx || span.voice !== voice) continue;
      const distance =
        pitch === null || span.startPitch === null ? 0 : Math.abs(span.startPitch - pitch);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestKey = key;
      }
    }
    return bestKey;
  }

  private handleDirection(node: XNode): void {
    const staffIdx = this.staffIdxOf(numberOr(node, "staff", 1));
    const localTick = this.cursor;

    const sound = child(node, "sound");
    const soundTempo = sound ? Number(attr(sound, "tempo") ?? "") : Number.NaN;

    const words: string[] = [];
    let metronome: XNode | undefined;

    for (const dt of childrenNamed(node, "direction-type")) {
      for (const item of childrenOf(dt)) {
        switch (tagOf(item)) {
          case "dynamics":
            this.emitDynamics(item, staffIdx, localTick);
            break;
          case "words":
            words.push(textOf(item));
            break;
          case "metronome":
            metronome = item;
            break;
          case "rehearsal":
            this.emitText(K.REHEARSAL_MARK, textOf(item), staffIdx, localTick);
            break;
          case "segno":
            this.emitText(K.STAFF_TEXT, "Segno", staffIdx, localTick);
            break;
          case "coda":
            this.emitText(K.STAFF_TEXT, "Coda", staffIdx, localTick);
            break;
          case "wedge":
            this.handleWedge(item, staffIdx, localTick);
            break;
          default:
            break;
        }
      }
    }

    const bpm =
      Number.isFinite(soundTempo) && soundTempo > 0
        ? soundTempo
        : metronome
          ? metronomeBpm(metronome)
          : null;

    const text = words.join(" ").trim() || (metronome ? metronomeText(metronome) : "");
    if (text === "") return;

    if (bpm !== null || metronome !== undefined) {
      this.push(localTick, {
        kind: K.TEMPO_TEXT,
        staff: staffIdx,
        voice: -1,
        textRaw: text,
        textNorm: text.toLowerCase(),
        ...(bpm !== null ? { tempo: Math.round(bpm) } : {}),
      });
      return;
    }

    this.emitText(K.STAFF_TEXT, text, staffIdx, localTick);
  }

  private emitText(kind: string, textRaw: string, staffIdx: number, localTick: number): void {
    if (textRaw === "") return;
    this.push(localTick, {
      kind,
      staff: staffIdx,
      voice: -1,
      textRaw,
      textNorm: textRaw.toLowerCase(),
    });
  }

  /**
   * `<dynamics>` の子要素名がそのまま正規化済みの強弱記号（`p` / `mf` / `sfz` …）になる。
   * MuseScore 経路の `parseDynamicText`（`dynamicForte` → `f`）と同じ語彙に落ちるため、
   * 追加の正規化は不要。
   */
  private emitDynamics(node: XNode, staffIdx: number, localTick: number): void {
    const symbols: string[] = [];
    for (const item of childrenOf(node)) {
      const tag = tagOf(item);
      if (tag === "other-dynamics") {
        const text = textOf(item);
        if (text !== "") symbols.push(text);
      } else if (tag !== "#text" && tag !== "") {
        symbols.push(tag);
      }
    }
    if (symbols.length === 0) return;
    const textRaw = symbols.join("");
    this.push(localTick, {
      kind: K.DYNAMIC,
      staff: staffIdx,
      voice: -1,
      textRaw,
      textNorm: textRaw.toLowerCase(),
    });
  }

  private handleWedge(node: XNode, staffIdx: number, localTick: number): void {
    const key = `${staffIdx}:${attr(node, "number") ?? "1"}`;
    const type = attr(node, "type");
    if (type === "crescendo" || type === "diminuendo") {
      this.openWedges.set(key, {
        staffIdx,
        voice: -1,
        start: this.here(localTick),
        end: this.here(localTick),
        startPitch: null,
        endPitch: null,
      });
    } else if (type === "stop") {
      const open = this.openWedges.get(key);
      if (!open) return;
      this.openWedges.delete(key);
      open.end = this.here(localTick);
      this.draft.hairpins.push(open);
    }
  }

  private handleBarline(node: XNode): void {
    const kind = barlineKindOf(node);
    if (kind === BK.UNKNOWN) return;

    // location 既定は right。右小節線の位置は小節長が確定してから解決するので、
    // localTick は使わず atMeasureEnd に委ねる。左小節線は小節頭（localTick 0）。
    const atEnd = (attr(node, "location") ?? "right") !== "left";
    for (let s = 0; s < this.ctx.staffCount; s++) {
      this.draft.events.push({
        measureIdx: this.measureIdx,
        localTick: 0,
        atMeasureEnd: atEnd,
        value: {
          kind: K.BAR_LINE,
          staff: this.ctx.staffOffset + s,
          voice: -1,
          barlineKind: kind,
        },
      });
    }
  }
}

function resolveRoot(doc: XNode[]): XNode {
  const partwise = find(doc, "score-partwise");
  if (partwise) return partwise;
  if (find(doc, "score-timewise")) {
    throw new Error(
      "score-timewise 形式の MusicXML には対応していません（score-partwise に変換してください）",
    );
  }
  throw new Error(
    "MusicXML のルート要素 <score-partwise> が見つかりません（MusicXML ファイルではない可能性があります）",
  );
}

/** MusicXML（score-partwise）のテキストから LintIR を組み立てる。 */
export function buildIRFromMusicXML(xmlText: string): LintIR {
  const root = resolveRoot(parseXml(xmlText));
  const partList = child(root, "part-list");
  const partNames = readPartNames(partList);
  const groupDrafts = readPartGroupDrafts(partList);

  const draft: ScoreDraft = {
    parts: [],
    partGroups: [],
    events: [],
    measureLengths: [],
    timeSigs: [],
    hairpins: [],
    slurs: [],
    ties: [],
  };

  // staffIdx は <part-list> の順ではなく <part> の出現順で決まるので、括弧の範囲は
  // ここで集めた対応表を使ってループ後に解決する。
  const rangeByPartId = new Map<string, StaffRange>();

  let staffOffset = 0;
  for (const partNode of childrenNamed(root, "part")) {
    const staffCount = countStaves(partNode);
    const partId = attr(partNode, "id") ?? "";
    const rawName = partNames.get(partId) ?? "";
    if (partId) rangeByPartId.set(partId, { start: staffOffset, count: staffCount });
    // MuseScore の getPartName と同じく、名前が空なら "Staff N" にフォールバックする
    for (let s = 0; s < staffCount; s++) {
      const staffIdx = staffOffset + s;
      draft.parts.push({
        staffIdx,
        partName: rawName.length > 0 ? rawName : `Staff ${staffIdx + 1}`,
      });
    }
    new PartWalker({ staffOffset, staffCount }, draft).walk(partNode);
    staffOffset += staffCount;
  }

  draft.partGroups = resolvePartGroups(groupDrafts, rangeByPartId);

  return assemble(draft);
}

function assemble(draft: ScoreDraft): LintIR {
  const measureStarts: number[] = [];
  let acc = 0;
  for (let i = 0; i < draft.measureLengths.length; i++) {
    measureStarts[i] = acc;
    acc += draft.measureLengths[i] ?? 0;
  }
  const absolute = (p: Placed): number => {
    const start = measureStarts[p.measureIdx] ?? 0;
    if (p.atMeasureEnd) return start + (draft.measureLengths[p.measureIdx] ?? 0);
    return start + p.localTick;
  };

  const events: EventSpec[] = draft.events.map((p) => ({
    ...p.value,
    tick: absolute(p),
    measure: p.measureIdx + 1,
  }));

  const toSpan = (s: SpanDraft) => ({
    staffIdx: s.staffIdx,
    voice: s.voice,
    startTick: absolute(s.start),
    endTick: absolute(s.end),
  });

  const hairpins: HairpinSpec[] = draft.hairpins.map((s) => {
    const { staffIdx, startTick, endTick } = toSpan(s);
    return { staffIdx, startTick, endTick };
  });
  const slurs: SlurSpec[] = draft.slurs.map(toSpan);
  const ties: TieSpec[] = draft.ties.map((s) => ({
    ...toSpan(s),
    startPitch: s.startPitch,
    endPitch: s.endPitch,
  }));

  const measures: MeasureInfo[] = [];
  for (let i = 0; i < draft.measureLengths.length; i++) {
    const sig = draft.timeSigs[i];
    if (sig === undefined) continue;
    measures.push({
      measure: i + 1,
      startTick: measureStarts[i],
      ticks: draft.measureLengths[i] ?? 0,
      timeSigN: sig.n,
      timeSigD: sig.d,
    });
  }

  return buildIR({
    parts: draft.parts,
    partGroups: draft.partGroups,
    events,
    hairpins,
    slurs,
    ties,
    measures,
  });
}
