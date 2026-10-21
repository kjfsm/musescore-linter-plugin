import type {
  AnnotationHints,
  BarlineKind,
  Fraction,
  Note,
  PartGroup,
  RepeatMark,
  Score,
  TimeSignature,
} from "@score-linter/score-model";
import { createScoreBuilder, TICKS_PER_QUARTER, toTpc } from "@score-linter/score-model";

import { articulationNameOf } from "./articulations.ts";
import { durationFromDivisions, durationFromType } from "./duration.ts";
import { readPartGroupDrafts, resolvePartGroups, type StaffRange } from "./partGroups.ts";
import { type ClefState, clefFrom, DEFAULT_CLEF, toMidiPitch, toStaffLine } from "./pitch.ts";
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
} from "./xml.ts";

/**
 * 小節内の相対位置。小節の長さは全パートを見終わるまで決まらないので、絶対 tick へは
 * 最後にまとめて直す。小節末に置く要素（右小節線）は `atMeasureEnd` で解決を遅らせる。
 */
interface Placed {
  measureIdx: number;
  localTick: number;
  atMeasureEnd?: boolean;
}

interface ChordDraft extends Placed {
  type: "chord";
  staff: number;
  voice: number;
  duration: Fraction | null;
  tuplet: boolean;
  fermata: boolean;
  notes: Note[];
  articulations: Set<string>;
}

interface RestDraft extends Placed {
  type: "rest";
  staff: number;
  voice: number;
  duration: Fraction | null;
  tuplet: boolean;
  fermata: boolean;
}

interface KeyDraft extends Placed {
  type: "key";
  staff: number;
  fifths: number;
}

interface BarlineDraft extends Placed {
  type: "barline";
  staff: number;
  kind: BarlineKind;
}

interface AnnotationDraft extends Placed {
  type: "annotation";
  staff: number;
  text: string;
  hints: AnnotationHints;
}

type Draft = ChordDraft | RestDraft | KeyDraft | BarlineDraft | AnnotationDraft;

interface SpanDraft {
  staff: number;
  voice: number;
  start: Placed;
  end: Placed;
  startPitch: number | null;
  endPitch: number | null;
}

interface ScoreDraft {
  drafts: Draft[];
  /** 全パートの最大値。 */
  measureLengths: number[];
  /** 最初に見つけたパートの値。 */
  timeSignatures: (TimeSignature | undefined)[];
  /** 最初のパートの `<measure number>`。 */
  labels: (string | undefined)[];
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

// <sound> の再生の指示のうち、反復記号として読めるもの
const SOUND_REPEATS: readonly [string, RepeatMark][] = [
  ["segno", "segno"],
  ["coda", "coda"],
  ["fine", "fine"],
  ["dalsegno", "dal-segno"],
  ["dacapo", "da-capo"],
  ["tocoda", "to-coda"],
];

function soundRepeats(sound: XNode): RepeatMark[] {
  const marks: RepeatMark[] = [];
  for (const [name, mark] of SOUND_REPEATS) {
    const value = attr(sound, name);
    // dacapo は yes/no、それ以外は飛び先のラベル（空でなければよい）
    if (value !== undefined && value !== "" && value !== "no") marks.push(mark);
  }
  return marks;
}

/** repeat が付いていれば bar-style より優先する。どちらも無ければ null。 */
function barlineKindOf(barline: XNode): BarlineKind | null {
  const directions = new Set(
    childrenNamed(barline, "repeat")
      .map((r) => attr(r, "direction") ?? "")
      .filter(Boolean),
  );
  if (directions.has("forward") && directions.has("backward")) return "repeat-both";
  if (directions.has("forward")) return "repeat-start";
  if (directions.has("backward")) return "repeat-end";

  switch (childText(barline, "bar-style")) {
    case "light-heavy":
    case "heavy":
      return "final";
    case "light-light":
    case "heavy-heavy":
      return "double";
    case "heavy-light":
      return "repeat-start";
    case undefined:
      return null;
    default:
      return "other";
  }
}

class VoiceAssigner {
  private readonly byStaff = new Map<number, Map<string, number>>();

  resolve(staff: number, voice: string | undefined): number {
    if (voice === undefined || voice === "") return 0;
    let map = this.byStaff.get(staff);
    if (!map) {
      map = new Map();
      this.byStaff.set(staff, map);
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
  isFirstPart: boolean;
}

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
 * 単純な分数で表せない拍子（複数の `<beats>` を持つ加算拍子、`<senza-misura>`）は
 * undefined にする。その小節は拍子なしとして扱われる。
 */
function readTimeSignature(time: XNode): TimeSignature | undefined {
  if (childrenNamed(time, "beats").length !== 1 || childrenNamed(time, "beat-type").length !== 1) {
    return undefined;
  }
  const n = childNumber(time, "beats");
  const d = childNumber(time, "beat-type");
  if (n === undefined || d === undefined) return undefined;
  if (!Number.isInteger(n) || !Number.isInteger(d) || n <= 0 || d <= 0) return undefined;
  return { numerator: n, denominator: d };
}

class PartWalker {
  private divisions = 1;
  /** `<time>` は変わるときにしか現れないので、次の変更まで持ち回る。 */
  private timeSignature: TimeSignature | undefined;
  private cursor = 0;
  private measureIdx = 0;
  private chordAnchorTick = 0;
  private currentChord: ChordDraft | null = null;
  private readonly clefs = new Map<number, ClefState>();
  private readonly voices = new VoiceAssigner();
  private readonly openTies = new Map<string, SpanDraft>();
  private readonly openSlurs = new Map<string, SpanDraft>();
  private readonly openWedges = new Map<string, SpanDraft>();

  private readonly ctx: PartContext;
  private readonly draft: ScoreDraft;

  constructor(ctx: PartContext, draft: ScoreDraft) {
    this.ctx = ctx;
    this.draft = draft;
  }

  private toTicks(divisionUnits: number): number {
    return Math.round((divisionUnits * TICKS_PER_QUARTER) / this.divisions);
  }

  private staffOf(staffNumber: number): number {
    const clamped = Math.min(Math.max(staffNumber, 1), Math.max(this.ctx.staffCount, 1));
    return this.ctx.staffOffset + clamped - 1;
  }

  private here(localTick: number): Placed {
    return { measureIdx: this.measureIdx, localTick };
  }

  private growMeasure(): void {
    const current = this.draft.measureLengths[this.measureIdx] ?? 0;
    if (this.cursor > current) this.draft.measureLengths[this.measureIdx] = this.cursor;
  }

  walk(partNode: XNode): void {
    const measures = childrenNamed(partNode, "measure");
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i]!;
      this.measureIdx = i;
      this.cursor = 0;
      this.chordAnchorTick = 0;
      this.currentChord = null;
      if (this.draft.measureLengths[i] === undefined) this.draft.measureLengths[i] = 0;
      // MusicXML 4.0 の text 属性が表示される番号。number は識別子で、表示とずれることがある
      if (this.ctx.isFirstPart) {
        this.draft.labels[i] = attr(measure, "text") ?? attr(measure, "number");
      }
      for (const node of childrenOf(measure)) this.handleMeasureChild(node);
      this.growMeasure();
      if (this.timeSignature !== undefined && this.draft.timeSignatures[i] === undefined) {
        this.draft.timeSignatures[i] = this.timeSignature;
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

    for (const time of childrenNamed(node, "time")) this.timeSignature = readTimeSignature(time);

    for (const key of childrenNamed(node, "key")) {
      const fifths = childNumber(key, "fifths");
      if (fifths === undefined) continue;
      const staffNumber = attr(key, "number");
      const staves =
        staffNumber === undefined
          ? Array.from({ length: Math.max(this.ctx.staffCount, 1) }, (_, i) => i + 1)
          : [Number(staffNumber)];
      for (const n of staves) {
        this.draft.drafts.push({
          type: "key",
          ...this.here(this.cursor),
          staff: this.staffOf(n),
          fifths,
        });
      }
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
    // グレースノートは拍位置を持たない
    if (hasChild(node, "grace")) return;

    const isChordNote = hasChild(node, "chord");
    const staffNumber = numberOr(node, "staff", 1);
    const staff = this.staffOf(staffNumber);
    const voice = this.voices.resolve(staff, childText(node, "voice"));

    const durationUnits = childNumber(node, "duration") ?? 0;
    const startTick = isChordNote ? this.chordAnchorTick : this.cursor;
    if (!isChordNote) {
      this.chordAnchorTick = this.cursor;
      this.cursor += this.toTicks(durationUnits);
      this.growMeasure();
    }

    const dots = childrenNamed(node, "dot").length;
    const duration =
      durationFromType(childText(node, "type"), dots) ??
      durationFromDivisions(durationUnits, this.divisions) ??
      null;
    // 音価の分母だけでは 4:3 のような 2 の冪になる連符を見分けられない
    const tuplet = hasChild(node, "time-modification");
    const fermata = childrenNamed(node, "notations").some((n) => hasChild(n, "fermata"));

    if (hasChild(node, "rest")) {
      this.currentChord = null;
      this.draft.drafts.push({
        type: "rest",
        ...this.here(startTick),
        staff,
        voice,
        duration,
        tuplet,
        fermata,
      });
      return;
    }

    let chord = isChordNote ? this.currentChord : null;
    if (!chord) {
      chord = {
        type: "chord",
        ...this.here(startTick),
        staff,
        voice,
        duration,
        tuplet,
        fermata: false,
        notes: [],
        articulations: new Set(),
      };
      this.draft.drafts.push(chord);
      this.currentChord = chord;
    }
    const note = this.readNote(node, staffNumber);
    if (note) chord.notes.push(note);
    if (fermata) chord.fermata = true;

    this.collectArticulations(node, chord);
    this.collectSlurs(node, staff, voice, startTick);
    this.collectTies(node, staff, voice, startTick, note?.pitch ?? null);
  }

  private readNote(node: XNode, staffNumber: number): Note | null {
    const pitch = child(node, "pitch");
    if (!pitch) return null; // <unpitched> は綴りを持たない
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

  private collectArticulations(node: XNode, chord: ChordDraft): void {
    for (const notations of childrenNamed(node, "notations")) {
      for (const group of childrenOf(notations)) {
        const groupTag = tagOf(group);
        if (groupTag !== "articulations" && groupTag !== "technical" && groupTag !== "ornaments") {
          continue;
        }
        for (const item of childrenOf(group)) {
          const name = articulationNameOf(tagOf(item));
          if (name) chord.articulations.add(name);
        }
      }
    }
  }

  private collectSlurs(node: XNode, staff: number, voice: number, localTick: number): void {
    for (const notations of childrenNamed(node, "notations")) {
      for (const slur of childrenNamed(notations, "slur")) {
        const key = attr(slur, "number") ?? "1";
        const type = attr(slur, "type");
        if (type === "start") {
          this.openSlurs.set(key, {
            staff,
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
    staff: number,
    voice: number,
    localTick: number,
    pitch: number | null,
  ): void {
    for (const notations of childrenNamed(node, "notations")) {
      for (const tied of childrenNamed(notations, "tied")) {
        const type = attr(tied, "type");
        const key = `${staff}:${voice}:${pitch ?? "?"}`;
        if (type === "start") {
          this.openTies.set(key, {
            staff,
            voice,
            start: this.here(localTick),
            end: this.here(localTick),
            startPitch: pitch,
            endPitch: pitch,
          });
        } else if (type === "stop") {
          // 同じ音高の始点が無ければ、同じ譜表・声部の開いているタイを拾う。
          // 異なる音高をタイで結んだ記譜ミスを、タイとして残して見つけられるようにするため。
          const openKey = this.openTies.has(key) ? key : this.findLooseTieKey(staff, voice, pitch);
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

  /** 同じ譜表・声部で開いているタイのうち、最も近い音高のもの。 */
  private findLooseTieKey(staff: number, voice: number, pitch: number | null): string | undefined {
    let bestKey: string | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [key, span] of this.openTies) {
      if (span.staff !== staff || span.voice !== voice) continue;
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
    const staff = this.staffOf(numberOr(node, "staff", 1));
    const localTick = this.cursor;

    const sound = child(node, "sound");
    const soundTempo = sound ? Number(attr(sound, "tempo") ?? "") : Number.NaN;

    const words: string[] = [];
    let metronome: XNode | undefined;

    for (const dt of childrenNamed(node, "direction-type")) {
      for (const item of childrenOf(dt)) {
        switch (tagOf(item)) {
          case "dynamics":
            this.emitDynamics(item, staff, localTick);
            break;
          case "words":
            words.push(textOf(item));
            break;
          case "metronome":
            metronome = item;
            break;
          case "rehearsal":
            this.emitAnnotation(textOf(item), { kind: "rehearsal" }, staff, localTick);
            break;
          case "segno":
            this.emitAnnotation("Segno", { repeats: ["segno"] }, staff, localTick);
            break;
          case "coda":
            this.emitAnnotation("Coda", { repeats: ["coda"] }, staff, localTick);
            break;
          case "wedge":
            this.handleWedge(item, staff, localTick);
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
    const repeats = sound ? soundRepeats(sound) : [];
    const hints: AnnotationHints = {
      ...(bpm !== null || metronome !== undefined
        ? { kind: "tempo" as const, bpm: bpm === null ? null : Math.round(bpm) }
        : {}),
      ...(repeats.length > 0 ? { repeats } : {}),
    };
    this.emitAnnotation(text, hints, staff, localTick);
  }

  private emitAnnotation(
    text: string,
    hints: AnnotationHints,
    staff: number,
    localTick: number,
  ): void {
    if (text === "") return;
    this.draft.drafts.push({ type: "annotation", ...this.here(localTick), staff, text, hints });
  }

  /**
   * `<dynamics>` の子要素名（`<p/>`・`<mf/>` …）がそのまま記号になる。
   * `<other-dynamics>` の文字は記号として読めるとは限らないので、修飾語として渡す。
   */
  private emitDynamics(node: XNode, staff: number, localTick: number): void {
    const symbols: string[] = [];
    const marks: string[] = [];
    const others: string[] = [];
    for (const item of childrenOf(node)) {
      const tag = tagOf(item);
      if (tag === "other-dynamics") {
        const text = textOf(item);
        if (text === "") continue;
        others.push(text);
        symbols.push(text);
      } else if (tag !== "#text" && tag !== "") {
        marks.push(tag);
        symbols.push(tag);
      }
    }
    const text = symbols.join("");
    const hints: AnnotationHints =
      marks.length > 0
        ? { kind: "dynamic", dynamic: { mark: marks.join(""), modifier: others.join(" ") } }
        : { kind: "dynamic" };
    this.emitAnnotation(text, hints, staff, localTick);
  }

  private handleWedge(node: XNode, staff: number, localTick: number): void {
    const key = `${staff}:${attr(node, "number") ?? "1"}`;
    const type = attr(node, "type");
    if (type === "crescendo" || type === "diminuendo") {
      this.openWedges.set(key, {
        staff,
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
    if (kind === null) return;
    // location の既定は right
    const atMeasureEnd = (attr(node, "location") ?? "right") !== "left";
    for (let s = 0; s < this.ctx.staffCount; s++) {
      this.draft.drafts.push({
        type: "barline",
        measureIdx: this.measureIdx,
        localTick: 0,
        atMeasureEnd,
        staff: this.ctx.staffOffset + s,
        kind,
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

export function readMusicXml(xmlText: string): Score {
  const root = resolveRoot(parseXml(xmlText));
  const partList = child(root, "part-list");
  const partNames = readPartNames(partList);
  const groupDrafts = readPartGroupDrafts(partList);

  const draft: ScoreDraft = {
    drafts: [],
    measureLengths: [],
    timeSignatures: [],
    labels: [],
    hairpins: [],
    slurs: [],
    ties: [],
  };

  // 譜表の番号は <part-list> の順ではなく <part> の出現順で決まるので、括弧の範囲は
  // 全パートを見終えてから解決する。
  const rangeByPartId = new Map<string, StaffRange>();
  const parts: { id: string; name: string; staffCount: number }[] = [];

  let staffOffset = 0;
  for (const partNode of childrenNamed(root, "part")) {
    const staffCount = countStaves(partNode);
    const partId = attr(partNode, "id") ?? "";
    const name = partNames.get(partId) ?? "";
    if (partId) rangeByPartId.set(partId, { start: staffOffset, count: staffCount });
    parts.push({
      id: partId || `staff-${staffOffset}`,
      name: name.length > 0 ? name : `Staff ${staffOffset + 1}`,
      staffCount,
    });
    new PartWalker({ staffOffset, staffCount, isFirstPart: parts.length === 1 }, draft).walk(
      partNode,
    );
    staffOffset += staffCount;
  }

  return assemble(parts, resolvePartGroups(groupDrafts, rangeByPartId), draft);
}

function assemble(
  parts: { id: string; name: string; staffCount: number }[],
  partGroups: PartGroup[],
  draft: ScoreDraft,
): Score {
  const builder = createScoreBuilder(parts);

  const measureStarts: number[] = [];
  let acc = 0;
  for (let i = 0; i < draft.measureLengths.length; i++) {
    const ticks = draft.measureLengths[i] ?? 0;
    measureStarts[i] = acc;
    builder.addMeasure({
      label: draft.labels[i] ?? String(i + 1),
      startTick: acc,
      ticks,
      timeSignature: draft.timeSignatures[i] ?? null,
    });
    acc += ticks;
  }
  const tickOf = (p: Placed): number => {
    const start = measureStarts[p.measureIdx] ?? 0;
    return p.atMeasureEnd ? start + (draft.measureLengths[p.measureIdx] ?? 0) : start + p.localTick;
  };

  // MusicXML は普通の小節線を書かない（<barline> は特別な線のときだけ現れる）。MuseScore から
  // 読んだ Score はすべての小節の終わりに小節線を持つので、書かれていない終わりの線を補って揃える。
  const staffCount = parts.reduce((n, p) => n + p.staffCount, 0);
  const endBarlines = new Set<string>();
  for (const d of draft.drafts) {
    if (d.type === "barline" && d.atMeasureEnd) endBarlines.add(`${d.measureIdx}:${d.staff}`);
  }
  for (let measureIdx = 0; measureIdx < draft.measureLengths.length; measureIdx++) {
    for (let staff = 0; staff < staffCount; staff++) {
      if (endBarlines.has(`${measureIdx}:${staff}`)) continue;
      draft.drafts.push({
        type: "barline",
        measureIdx,
        localTick: 0,
        atMeasureEnd: true,
        staff,
        kind: "other",
      });
    }
  }

  for (const d of draft.drafts) {
    const at = { tick: tickOf(d), measure: d.measureIdx + 1 };
    switch (d.type) {
      case "chord":
        builder.addChord(d.staff, d.voice, {
          ...at,
          duration: d.duration,
          tuplet: d.tuplet,
          fermata: d.fermata,
          notes: d.notes,
          articulations: [...d.articulations].sort(),
        });
        break;
      case "rest":
        builder.addRest(d.staff, d.voice, {
          ...at,
          duration: d.duration,
          tuplet: d.tuplet,
          fermata: d.fermata,
        });
        break;
      case "key":
        builder.addKeySignature(d.staff, { ...at, fifths: d.fifths });
        break;
      case "barline":
        builder.addBarline(d.staff, { ...at, kind: d.kind });
        break;
      case "annotation":
        builder.addAnnotation({
          ...at,
          scope: { type: "staff", staff: d.staff },
          text: d.text,
          hints: d.hints,
        });
        break;
    }
  }

  for (const s of draft.slurs) {
    builder.addSlur({
      staff: s.staff,
      voice: s.voice,
      startTick: tickOf(s.start),
      endTick: tickOf(s.end),
    });
  }
  for (const t of draft.ties) {
    builder.addTie({
      staff: t.staff,
      voice: t.voice,
      startTick: tickOf(t.start),
      endTick: tickOf(t.end),
      startPitch: t.startPitch,
      endPitch: t.endPitch,
    });
  }
  for (const h of draft.hairpins) {
    builder.addHairpin({ staff: h.staff, startTick: tickOf(h.start), endTick: tickOf(h.end) });
  }
  for (const g of partGroups) builder.addPartGroup(g);

  return builder.finish();
}
