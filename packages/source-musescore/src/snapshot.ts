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
import type {
  BracketTypeEnum,
  EngravingItem,
  Measure,
  MuseScore,
  Score,
} from "@kjfsm/musescore-plugin-sdk-types";
import { generatedFrom } from "@kjfsm/musescore-plugin-sdk-types";
import type {
  HostVersionInfo,
  IRBuilder,
  LintIR,
  MeasureInfo,
  PartGroupInfo,
  PartGroupSymbol,
} from "@musescore-linter/core";
import { CANONICAL, createIRBuilder, createPerf, makeLogger } from "@musescore-linter/core";
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
    // bracketType は strictEnum で包まない。包むと未知メンバの参照で throw し、
    // 小節ループの外で走る readPartGroups が落ちてスナップショット全体を巻き込む。
    // 代償として、上流で enum が再採番されても検知できず黙って別の記号にマップされる。
    // 括弧は比較範囲の絞り込みにしか使わない補助情報なので、全体を落とすより許容する。
    bracketType: hostEnums.bracketType,
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

const BRACKET_SYMBOL_BY_MEMBER: Record<string, PartGroupSymbol> = {
  NORMAL: "bracket",
  BRACE: "brace",
  SQUARE: "square",
  LINE: "line",
  // NO_BRACKET は「括弧なし」なので採らない
};

/**
 * 譜表に付いたシステムブラケットを読む。MuseScore は括弧を「開始譜表」に持たせるので、
 * 全譜表を 1 周すれば各括弧がちょうど 1 回ずつ拾える。
 *
 * `bracketType`（実行時 enum）が無い＝古い QML から呼ばれた場合は空配列を返す。
 * checker 側はこれを見て全パート比較へフォールバックする。
 */
function readPartGroups(score: Score, bracketType: BracketTypeEnum | undefined): PartGroupInfo[] {
  const out: PartGroupInfo[] = [];
  const staves = score.staves;
  if (!bracketType || !staves) return out;

  // 実行中の版に無いメンバは undefined になる。その値には決してマッチしないよう、
  // undefined のエントリは対応表から落としておく。
  const symbolByValue = new Map<unknown, PartGroupSymbol>();
  for (const [member, symbol] of Object.entries(BRACKET_SYMBOL_BY_MEMBER)) {
    const value = (bracketType as unknown as Record<string, unknown>)[member];
    if (value !== undefined) symbolByValue.set(value, symbol);
  }

  // 同じ範囲・同じ種類の括弧が別カラムに重複していても 1 本として扱う
  // （MusicXML 経路の resolvePartGroups と揃える）。
  const seen = new Set<string>();

  for (let i = 0; i < staves.length; i++) {
    const staff = staves[i];
    if (!staff) continue;
    const startStaffIdx = typeof staff.idx === "number" ? staff.idx : i;
    for (const bracket of staff.brackets ?? []) {
      const symbol = symbolByValue.get(bracket.systemBracket);
      if (!symbol) continue;
      const staffCount = bracket.bracketSpan;
      if (typeof staffCount !== "number" || staffCount < 2) continue;
      const key = `${symbol}:${startStaffIdx}:${staffCount}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ symbol, startStaffIdx, staffCount });
    }
  }

  // 外側の括弧が先に来る並び（MusicXML 経路と揃える）
  return out.sort((a, b) => a.startStaffIdx - b.startStaffIdx || b.staffCount - a.staffCount);
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

function processAnnotations(seg: PluginSegment, measureNum: number, builder: IRBuilder): void {
  if (!seg.annotations) return;

  for (const ann of seg.annotations) {
    const textRaw = getAnnotationText(ann);
    if (textRaw.length === 0) continue;

    const annStaffIdx = getAnnotationStaffIdx(ann);
    const annKind = resolveAnnotationKind(ann);
    const textNorm = resolveAnnotationTextNorm(ann, textRaw);
    // getTempoBpm は Math.round(el.tempo * 60) を返すだけなので、el.tempo が
    // 未定義だと NaN、null だと 0 になる。LintEvent.tempo は「正の有限数か
    // null」でなければならない（tempo-without-bpm は null/undefined しか
    // 弾かず、NaN や 0 を「BPM あり」と誤判定して素通りさせてしまう）。
    // MusicXML 経路の soundTempo も同じ条件で見ている。
    const rawTempo = isTempo(ann) ? getTempoBpm(ann) : null;
    const tempo =
      typeof rawTempo === "number" && Number.isFinite(rawTempo) && rawTempo > 0 ? rawTempo : null;

    builder.append({
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
  builder: IRBuilder,
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
      const ev = builder.append({
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
        // 連符ブラケット内か。SDK の DurationElement.tuplet をそのまま反映する。
        ...(el.tuplet ? { tuplet: true } : {}),
      });

      if (isChord(el)) {
        ev.stemDirection = el.stemDirection;
        ev.beamMode = el.beamMode;
        ev.articulations = getArticulationNames(el);
        ev.notes = getNoteSpellings(el);
        for (const note of el.notes ?? []) {
          const tie = note.tieForward;
          if (tie) {
            const tiePitches = getTiePitches(tie);
            builder.ir.meta.ties.push({
              staffIdx,
              voice,
              ...getSpannerRange(tie),
              startPitch: tiePitches?.startPitch ?? null,
              endPitch: tiePitches?.endPitch ?? null,
            });
          }
          for (const spanner of note.spannerForward ?? []) {
            if (isHairpin(spanner)) {
              builder.ir.meta.hairpins.push({ staffIdx, ...getHairpinRange(spanner) });
            } else if (isSlur(spanner)) {
              builder.ir.meta.slurs.push({
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
      builder.append({
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

  // 索引の張り方と既定値の解決は core のビルダに任せる。以前はここに同じものを
  // 自前で持っており、既定の measure や scope/type の導出がドリフトしていた。
  const builder = createIRBuilder({
    parts: Array.from({ length: numStaves }, (_, i) => ({
      staffIdx: i,
      partName: getPartName(score, i),
    })),
    partGroups: readPartGroups(score, wrappedHostEnums.bracketType),
    hostVersion: buildHostVersionInfo(host),
  });
  const { ir } = builder;

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
        processAnnotations(seg, measureNum, builder);
        perf.addSince("annotations", tAnn);

        const tStaff = perf.now();
        for (const staffIdx of iterateStaves(score)) {
          processStaffElements(seg, measureNum, staffIdx, builder, wrappedHostEnums);
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
