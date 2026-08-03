import { CANONICAL } from "./enumRegistry.js";
import type { LintEvent, LintIR, MeasureInfo, NoteInfo } from "./types.js";

/**
 * プレーンな spec から LintIR を組み立てる汎用ビルダ。
 *
 * MuseScore ランタイムに一切依存しないので、テストの fixture 生成にも、MusicXML など
 * MuseScore 以外のソースから IR を作るパーサーの実装にも使える。`index` の 4 種と
 * `meta.lastTick` / `meta.firstMusicTickByStaff` は spec から自動で導出される。
 */

export interface EventSpec {
  kind: string;
  /** 省略時は `kind` から導出する（chord/rest/bar_line 以外は "text"） */
  type?: LintEvent["type"];
  tick?: number;
  measure?: number;
  /** `staffIdx` のエイリアス。両方省略すると -1（global scope）になる */
  staff?: number;
  staffIdx?: number;
  voice?: number;
  textNorm?: string;
  textRaw?: string;
  tempo?: number;
  barlineKind?: string;
  duration?: { numerator: number; denominator: number };
  tuplet?: boolean;
  scope?: "staff" | "global";
  subtype?: unknown;
  subStyle?: unknown;
  stemDirection?: number;
  beamMode?: number;
  articulations?: string[];
  notes?: NoteInfo[];
}

export interface PartSpec {
  staffIdx?: number;
  partName?: string;
}

export interface HairpinSpec {
  staffIdx: number;
  startTick: number;
  endTick: number;
}

export interface SlurSpec {
  staffIdx: number;
  voice: number;
  startTick: number;
  endTick: number;
}

export interface TieSpec {
  staffIdx: number;
  voice: number;
  startTick: number;
  endTick: number;
  startPitch: number | null;
  endPitch: number | null;
}

export interface IRSpec {
  parts?: PartSpec[];
  events?: EventSpec[];
  hairpins?: HairpinSpec[];
  slurs?: SlurSpec[];
  ties?: TieSpec[];
  measures?: MeasureInfo[];
}

function typeFromKind(kind: string): LintEvent["type"] {
  if (kind === CANONICAL.elementKinds.CHORD) return "chord";
  if (kind === CANONICAL.elementKinds.REST) return "rest";
  if (kind === CANONICAL.elementKinds.BAR_LINE) return "barline";
  return "text";
}

function pushId(map: Record<string, number[]>, key: string | number, id: number): void {
  const k = String(key);
  if (!map[k]) map[k] = [];
  map[k].push(id);
}

export function buildIR(spec: IRSpec): LintIR {
  const parts = (spec.parts ?? []).map((p, i) => ({
    staffIdx: p.staffIdx !== undefined ? p.staffIdx : i,
    partName: p.partName ?? `Staff ${i + 1}`,
  }));

  const ir: LintIR = {
    events: [],
    index: { byStaff: {}, byTick: {}, byKind: {}, byStaffAndKind: {} },
    meta: {
      parts,
      firstMusicTickByStaff: parts.map(() => null),
      lastTick: 0,
      hairpins: (spec.hairpins ?? []).map((h) => ({ ...h })),
      slurs: (spec.slurs ?? []).map((s) => ({ ...s })),
      ties: (spec.ties ?? []).map((t) => ({ ...t })),
      measures: (spec.measures ?? []).map((m) => ({ ...m })),
    },
    registry: { canonical: CANONICAL },
    derived: null,
  };

  for (const e of spec.events ?? []) {
    const staffIdx = e.staff !== undefined ? e.staff : e.staffIdx !== undefined ? e.staffIdx : -1;
    const defaultScope: "staff" | "global" = staffIdx >= 0 ? "staff" : "global";
    const scope = e.scope ?? defaultScope;

    const ev: LintEvent = {
      id: ir.events.length,
      tick: e.tick ?? 0,
      measure: e.measure ?? 1,
      staffIdx,
      voice: e.voice ?? -1,
      kind: e.kind,
      type: e.type ?? (scope === "global" ? "text" : typeFromKind(e.kind)),
      subtype: e.subtype ?? null,
      subStyle: e.subStyle ?? null,
      tempo: e.tempo ?? null,
      textNorm: e.textNorm ?? "",
      textRaw: e.textRaw ?? "",
      scope,
    };

    if (e.barlineKind !== undefined) ev.barlineKind = e.barlineKind;
    if (e.duration !== undefined) ev.duration = e.duration;
    if (e.tuplet !== undefined) ev.tuplet = e.tuplet;
    if (e.stemDirection !== undefined) ev.stemDirection = e.stemDirection;
    if (e.beamMode !== undefined) ev.beamMode = e.beamMode;
    if (e.articulations !== undefined) ev.articulations = e.articulations;
    if (e.notes !== undefined) ev.notes = e.notes;

    ir.events.push(ev);

    pushId(ir.index.byTick, ev.tick, ev.id);
    pushId(ir.index.byKind, ev.kind, ev.id);
    pushId(ir.index.byStaff, ev.staffIdx, ev.id);

    if (!ir.index.byStaffAndKind[ev.staffIdx]) ir.index.byStaffAndKind[ev.staffIdx] = {};
    pushId(ir.index.byStaffAndKind[ev.staffIdx], ev.kind, ev.id);

    if (ev.tick > ir.meta.lastTick) ir.meta.lastTick = ev.tick;

    const isMusic =
      ev.kind === CANONICAL.elementKinds.CHORD || ev.kind === CANONICAL.elementKinds.REST;
    if (ev.staffIdx >= 0 && isMusic && ir.meta.firstMusicTickByStaff[ev.staffIdx] === null) {
      ir.meta.firstMusicTickByStaff[ev.staffIdx] = ev.tick;
    }
  }

  return ir;
}
