import {
  checkHostVersion,
  classifyBarlineKind,
  getAnnotationStaffIdx,
  getAnnotationText,
  getArticulationNames,
  getHairpinRange,
  getMeasureTimeSig,
  getNoteSpellings,
  getSpannerRange,
  getTempoBpm,
  getTiePitches,
  isBarLine,
  isChord,
  isDynamic,
  isExpression,
  isGraceNote,
  isHairpin,
  isPlayTechAnnotation,
  isRehearsalMark,
  isRest,
  isSlur,
  isStaffText,
  isSystemText,
  isTempo,
  iterateMeasureSegments,
  iterateMeasures,
  iterateStaves,
  parseDynamicText,
  staffVoiceToTrack,
  strictEnum,
  trackToStaffIdx,
  VOICES_PER_STAFF,
} from "@kjfsm/musescore-plugin-sdk-helpers";
import type { EngravingItem, Measure, MuseScore, Score } from "@kjfsm/musescore-plugin-sdk-types";
import { generatedFrom } from "@kjfsm/musescore-plugin-sdk-types";
import type { HostVersionInfo, LintEvent, LintIR, MeasureInfo } from "@musescore-linter/core";
import { CANONICAL, createPerf, makeLogger } from "@musescore-linter/core";
import type { PluginSegment, TextAnnotation } from "@musescore-linter/musescore-api";

import type { HostEnums } from "./types.js";

const log = makeLogger("snapshot");

// 走査の内訳を計測する。既定では無効（setPerfEnabled(true) で有効化）。
const perf = createPerf("snapshot");

/** 直近の buildSnapshot の計測結果。計測が無効なら空文字列。 */
export function getSnapshotPerfReport(): string {
  return perf.report();
}

// MuseScore 4.4+（Qt6 の V4 エンジン）は ES6 Proxy をサポートする（.claude/skills/musescore-qt-versions
// の対応表参照）。念のためガードし、非対応環境では生の enum のまま渡す（strictEnum の恩恵は失うが
// 通常の判定は動く）。
function wrapHostEnums(hostEnums: HostEnums): HostEnums {
  if (typeof Proxy === "undefined") return hostEnums;
  return {
    noteType: strictEnum("NoteType", hostEnums.noteType),
    barLineType: strictEnum("BarLineType", hostEnums.barLineType),
  };
}

// 型の生成元 MuseScore バージョン（generatedFrom.tag）と実行中の版を照合する。host が渡された
// ときのみ実行（QML から plugin オブジェクトを渡す想定）。
function buildHostVersionInfo(host: MuseScore | undefined): HostVersionInfo | undefined {
  if (!host) return undefined;
  const running = `${host.mscoreMajorVersion}.${host.mscoreMinorVersion}`;
  const check = checkHostVersion(host);
  if (check.ok) {
    return { ok: true, generatedTag: generatedFrom.tag, running };
  }
  return {
    ok: false,
    generatedTag: generatedFrom.tag,
    running,
    message: check.message,
  };
}

function getPartName(score: Score, staffIdx: number): string {
  if (!score.parts) return `Staff ${staffIdx + 1}`;
  let trackOffset = 0;
  for (const part of score.parts) {
    const staveCount = trackToStaffIdx(part.endTrack) - trackToStaffIdx(part.startTrack);
    if (staffIdx >= trackOffset && staffIdx < trackOffset + staveCount) {
      const name = part.longName ?? "";
      return name.length > 0 ? name : `Staff ${staffIdx + 1}`;
    }
    trackOffset += staveCount;
  }
  return `Staff ${staffIdx + 1}`;
}

function pushIndexedId(map: Record<string, number[]>, key: string | number, eventId: number): void {
  const k = String(key);
  if (!map[k]) map[k] = [];
  map[k].push(eventId);
}

function appendEvent(ir: LintIR, payload: Partial<LintEvent> & { kind: string }): LintEvent {
  const ev: LintEvent = {
    id: ir.events.length,
    tick: payload.tick ?? 0,
    measure: payload.measure ?? 0,
    staffIdx: payload.staffIdx ?? -1,
    voice: payload.voice ?? -1,
    kind: payload.kind,
    type: payload.type ?? "other",
    subtype: payload.subtype ?? null,
    subStyle: payload.subStyle ?? null,
    tempo: payload.tempo ?? null,
    textNorm: payload.textNorm ?? "",
    textRaw: payload.textRaw ?? "",
    scope: payload.scope ?? "staff",
  };

  if (payload.barlineType !== undefined) ev.barlineType = payload.barlineType;
  if (payload.barlineKind !== undefined) ev.barlineKind = payload.barlineKind;
  if (payload.duration !== undefined) ev.duration = payload.duration;

  ir.events.push(ev);

  pushIndexedId(ir.index.byTick, ev.tick, ev.id);
  pushIndexedId(ir.index.byKind, ev.kind, ev.id);
  pushIndexedId(ir.index.byStaff, ev.staffIdx, ev.id);

  if (!ir.index.byStaffAndKind[ev.staffIdx]) {
    ir.index.byStaffAndKind[ev.staffIdx] = {};
  }
  pushIndexedId(ir.index.byStaffAndKind[ev.staffIdx], ev.kind, ev.id);

  if (ev.tick > ir.meta.lastTick) ir.meta.lastTick = ev.tick;
  return ev;
}

function resolveAnnotationKind(ann: TextAnnotation): string {
  if (isTempo(ann)) return CANONICAL.elementKinds.TEMPO_TEXT;
  if (isDynamic(ann)) return CANONICAL.elementKinds.DYNAMIC;
  if (isExpression(ann)) return CANONICAL.elementKinds.EXPRESSION;
  if (isStaffText(ann) || isPlayTechAnnotation(ann)) return CANONICAL.elementKinds.STAFF_TEXT;
  if (isSystemText(ann)) return CANONICAL.elementKinds.SYSTEM_TEXT;
  if (isRehearsalMark(ann)) return CANONICAL.elementKinds.REHEARSAL_MARK;
  return CANONICAL.elementKinds.UNKNOWN;
}

function resolveAnnotationTextNorm(ann: TextAnnotation, textRaw: string): string {
  if (isDynamic(ann)) return parseDynamicText(textRaw);
  return textRaw.toLowerCase();
}

function processAnnotations(seg: PluginSegment, measureNum: number, ir: LintIR): void {
  if (!seg.annotations) return;

  for (const ann of seg.annotations) {
    const textRaw = getAnnotationText(ann);
    if (textRaw.length === 0) continue;

    const annStaffIdx = getAnnotationStaffIdx(ann);
    const annKind = resolveAnnotationKind(ann);
    const textNorm = resolveAnnotationTextNorm(ann, textRaw);
    const tempo = isTempo(ann) ? getTempoBpm(ann) : null;

    appendEvent(ir, {
      type: "text",
      kind: annKind,
      tick: seg.tick,
      measure: measureNum,
      staffIdx: annStaffIdx >= 0 ? annStaffIdx : -1,
      voice: -1,
      subtype: ann.subtype,
      subStyle: ann.subStyle,
      tempo,
      textNorm,
      textRaw,
      scope: annStaffIdx >= 0 ? "staff" : "global",
    });
  }
}

// elementAt は QML↔C++ の境界を越えるので、1 track につき 1 回に抑える。この 1 回あたりの
// コストは実測で約 1.3 μs、譜面 2 種で一致しており、走査時間はほぼこの呼び出し回数で決まる。
// segment × staff ごとに配列を作ると GC 圧が増えるため、モジュールレベルのバッファを
// 使い回す（走査は同期処理なので再入しない）。
const trackElements: (EngravingItem | null)[] = Array.from<EngravingItem | null>({
  length: VOICES_PER_STAFF,
}).fill(null);

function processStaffElements(
  seg: PluginSegment,
  measureNum: number,
  staffIdx: number,
  ir: LintIR,
  hostEnums: HostEnums,
): void {
  for (let voice = 0; voice < VOICES_PER_STAFF; voice++) {
    trackElements[voice] = seg.elementAt(staffVoiceToTrack(staffIdx, voice));
  }

  for (let voice = 0; voice < VOICES_PER_STAFF; voice++) {
    const el = trackElements[voice];
    if (!el) continue;

    // グレースノートは LintIR に含めない（拍位置のタイミングを持たないため）
    if (isChord(el) && isGraceNote(el, hostEnums.noteType)) continue;

    if (isChord(el) || isRest(el)) {
      const evType = isChord(el) ? "chord" : "rest";
      const kind = isChord(el) ? CANONICAL.elementKinds.CHORD : CANONICAL.elementKinds.REST;
      const ev = appendEvent(ir, {
        type: evType as "chord" | "rest",
        kind,
        tick: seg.tick,
        measure: measureNum,
        staffIdx,
        voice,
        scope: "staff",
        ...(el.duration
          ? {
              duration: {
                numerator: el.duration.numerator,
                denominator: el.duration.denominator,
              },
            }
          : {}),
      });

      if (ir.meta.firstMusicTickByStaff[staffIdx] === null) {
        ir.meta.firstMusicTickByStaff[staffIdx] = seg.tick;
      }

      if (isChord(el)) {
        ev.stemDirection = el.stemDirection;
        ev.beamMode = el.beamMode;
        ev.articulations = getArticulationNames(el);
        ev.notes = getNoteSpellings(el);
        for (const note of el.notes ?? []) {
          const tie = note.tieForward;
          if (tie) {
            const tiePitches = getTiePitches(tie);
            ir.meta.ties.push({
              staffIdx,
              voice,
              ...getSpannerRange(tie),
              startPitch: tiePitches?.startPitch ?? null,
              endPitch: tiePitches?.endPitch ?? null,
            });
          }
          for (const spanner of note.spannerForward ?? []) {
            if (isHairpin(spanner)) {
              ir.meta.hairpins.push({ staffIdx, ...getHairpinRange(spanner) });
            } else if (isSlur(spanner)) {
              ir.meta.slurs.push({
                staffIdx,
                voice,
                ...getSpannerRange(spanner),
              });
            }
          }
        }
      }
    }
  }

  // chord/rest とは別ループのままにしてイベントの生成順（= id 順）を変えない。
  // 引き直さず上で取得済みの要素を見る。
  for (let v = 0; v < VOICES_PER_STAFF; v++) {
    const barEl = trackElements[v];
    if (barEl && isBarLine(barEl)) {
      appendEvent(ir, {
        type: "barline",
        kind: CANONICAL.elementKinds.BAR_LINE,
        barlineType: barEl.barlineType,
        barlineKind: classifyBarlineKind(barEl.barlineType, hostEnums.barLineType),
        tick: seg.tick,
        measure: measureNum,
        staffIdx,
        voice: -1,
        scope: "staff",
      });
      break;
    }
  }
}

/**
 * 小節の拍子・先頭 tick・長さ。1 つでも取れなければ null を返し、その小節は
 * `meta.measures` に載せない（拍位置を使う checker はその小節を判定対象から外す）。
 */
function readMeasureInfo(measure: Measure, measureNum: number): MeasureInfo | null {
  const sig = getMeasureTimeSig(measure);
  const slash = sig.indexOf("/");
  if (slash <= 0) return null;

  const timeSigN = Number(sig.slice(0, slash));
  const timeSigD = Number(sig.slice(slash + 1));
  if (!Number.isInteger(timeSigN) || !Number.isInteger(timeSigD)) return null;
  if (timeSigN <= 0 || timeSigD <= 0) return null;

  const startTick = measure.tick?.ticks;
  const ticks = measure.ticks?.ticks;
  if (typeof startTick !== "number" || typeof ticks !== "number") return null;
  if (!Number.isFinite(startTick) || !Number.isFinite(ticks)) return null;

  return { measure: measureNum, startTick, ticks, timeSigN, timeSigD };
}

export function buildSnapshot(score: Score, hostEnums: HostEnums, host?: MuseScore): LintIR {
  const numStaves = score.nstaves;
  const wrappedHostEnums = wrapHostEnums(hostEnums);

  const ir: LintIR = {
    events: [],
    index: { byStaff: {}, byTick: {}, byKind: {}, byStaffAndKind: {} },
    meta: {
      parts: Array.from({ length: numStaves }, (_, i) => ({
        staffIdx: i,
        partName: getPartName(score, i),
      })),
      firstMusicTickByStaff: Array(numStaves).fill(null) as (number | null)[],
      lastTick: 0,
      hairpins: [],
      slurs: [],
      ties: [],
      measures: [],
      hostVersion: buildHostVersionInfo(host),
    },
    registry: { canonical: CANONICAL },
    derived: null,
  };

  // 計時は segment 単位に留める。staff/voice ごとに Date.now() を呼ぶと計測自体が
  // 数万回走って対象を歪めるため。
  perf.clear();
  const tTotal = perf.now();

  let measureNum = 1;
  let segCount = 0;
  for (const m of iterateMeasures(score)) {
    try {
      // 1 小節につき 1 回だけ。拍位置を使う checker 向けの枠組み情報。
      const info = readMeasureInfo(m, measureNum);
      if (info) ir.meta.measures.push(info);

      for (const seg of iterateMeasureSegments(m) as Iterable<PluginSegment>) {
        segCount++;

        const tAnn = perf.now();
        processAnnotations(seg, measureNum, ir);
        perf.addSince("annotations", tAnn);

        const tStaff = perf.now();
        for (const staffIdx of iterateStaves(score)) {
          processStaffElements(seg, measureNum, staffIdx, ir, wrappedHostEnums);
        }
        perf.addSince("staffElements", tStaff);
      }
    } catch (e) {
      log.warn(`measure ${measureNum} の解析中にエラー: ${e}`);
    }
    measureNum++;
  }

  perf.addSince("total", tTotal);
  perf.count("measures", measureNum - 1);
  perf.count("segments", segCount);
  perf.count("staves", numStaves);
  perf.count("events", ir.events.length);
  // 実測ではなく構造からの概算（ラベルは桁を揃えるため ASCII のみ）。processStaffElements は
  // 1 segment × 1 staff あたり全 voice を 1 回ずつ引き、chord/rest 用と barline 用で使い回す。
  perf.count("elementAt(est)", segCount * numStaves * VOICES_PER_STAFF);

  log.info(
    `LintIR を生成: events=${ir.events.length}, parts=${ir.meta.parts.length}, lastTick=${ir.meta.lastTick}`,
  );
  return ir;
}
