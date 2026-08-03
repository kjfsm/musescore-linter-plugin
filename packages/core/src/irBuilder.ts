import { CANONICAL } from "./enumRegistry.js";
import type {
  HostVersionInfo,
  LintEvent,
  LintIR,
  MeasureInfo,
  NoteInfo,
  PartGroupInfo,
} from "./types.js";

/**
 * プレーンな spec から LintIR を組み立てる汎用ビルダ。
 *
 * MuseScore ランタイムに一切依存しないので、テストの fixture 生成にも、MuseScore /
 * MusicXML どちらのパーサー実装にも使える。`index` の 4 種と `meta.lastTick` /
 * `meta.firstMusicTickByStaff` は spec から自動で導出される。
 *
 * 入口が 2 つあるのは、入力の届き方が違うため:
 * - {@link buildIR} — spec を一括で渡す。テスト fixture と MusicXML パーサー向け。
 * - {@link createIRBuilder} — イベントを 1 件ずつ足す。MuseScore パーサーは小節・
 *   セグメント・声部を順に走査するので、全イベントを配列に溜めてから渡す形にできない。
 *
 * 索引の張り方と既定値の解決はどちらも同じ経路（`appendTo`）を通る。以前は MuseScore 側が
 * これを自前で再実装しており、既定の measure（0 と 1）・scope の導出有無・type の導出有無が
 * 実際にドリフトしていた。
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
  /** BPM。null は「テンポ表記だが BPM 値が無い」を表すので undefined と区別して受ける。 */
  tempo?: number | null;
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
  /** MuseScore の BarLineType 生値。checker は barlineKind を見るのでそちらが正。 */
  barlineType?: unknown;
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
  partGroups?: PartGroupInfo[];
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

/** イベントを 1 件足し、索引と meta.lastTick / firstMusicTickByStaff を更新する。 */
function appendTo(ir: LintIR, e: EventSpec): LintEvent {
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

  if (e.barlineType !== undefined) ev.barlineType = e.barlineType;
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

  return ev;
}

export interface IRBuilderInit {
  parts?: PartSpec[];
  partGroups?: PartGroupInfo[];
  /** MuseScore 経路のみ。実行版と型の生成元バージョンの照合結果（診断用）。 */
  hostVersion?: HostVersionInfo;
}

export interface IRBuilder {
  /**
   * 組み立て中の LintIR。`meta.measures` のように走査しながら push していくものは
   * ここへ直接足す。イベントは必ず {@link append} を通すこと（索引が張られなくなる）。
   */
  readonly ir: LintIR;
  /** イベントを 1 件足して、作られた LintEvent を返す。 */
  append(e: EventSpec): LintEvent;
}

/**
 * イベントを 1 件ずつ足していく形のビルダ。走査しながら IR を組み立てるパーサー向け。
 * 一括で spec を渡せるなら {@link buildIR} のほうが短い。
 */
export function createIRBuilder(init: IRBuilderInit = {}): IRBuilder {
  const parts = (init.parts ?? []).map((p, i) => ({
    staffIdx: p.staffIdx !== undefined ? p.staffIdx : i,
    partName: p.partName ?? `Staff ${i + 1}`,
  }));

  const ir: LintIR = {
    events: [],
    index: { byStaff: {}, byTick: {}, byKind: {}, byStaffAndKind: {} },
    meta: {
      parts,
      partGroups: (init.partGroups ?? []).map((g) => ({ ...g })),
      firstMusicTickByStaff: parts.map(() => null),
      lastTick: 0,
      hairpins: [],
      slurs: [],
      ties: [],
      measures: [],
      ...(init.hostVersion !== undefined ? { hostVersion: init.hostVersion } : {}),
    },
    registry: { canonical: CANONICAL },
    derived: null,
  };

  return {
    ir,
    append: (e) => appendTo(ir, e),
  };
}

export function buildIR(spec: IRSpec): LintIR {
  const builder = createIRBuilder({ parts: spec.parts, partGroups: spec.partGroups });
  const { ir } = builder;

  ir.meta.hairpins = (spec.hairpins ?? []).map((h) => ({ ...h }));
  ir.meta.slurs = (spec.slurs ?? []).map((s) => ({ ...s }));
  ir.meta.ties = (spec.ties ?? []).map((t) => ({ ...t }));
  ir.meta.measures = (spec.measures ?? []).map((m) => ({ ...m }));

  for (const e of spec.events ?? []) builder.append(e);

  return ir;
}
