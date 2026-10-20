import type {
  EngravingItem,
  Measure as MsMeasure,
  Score as MsScore,
  PlayingTechniqueTypeName,
  Segment,
} from "@score-linter/musescore-api-types";
import type { ConnectedHelpers } from "@score-linter/musescore-plugin-helpers";
import {
  getAnnotationStaffIdx,
  getAnnotationText,
  getArticulationNames,
  getHairpinRange,
  getMeasureTimeSig,
  getSpannerRange,
  getTempoBpm,
  isBarLine,
  isChord,
  isDynamic,
  isExpression,
  isHairpin,
  isPlayTechAnnotation,
  isRehearsalMark,
  isRest,
  isSlur,
  isStaffText,
  isSystemText,
  isTempo,
  iterateMeasures,
  staffVoiceToTrack,
  trackToStaffIdx,
  VOICES_PER_STAFF,
} from "@score-linter/musescore-plugin-helpers";
import type {
  AnnotationHints,
  PartGroupSymbol,
  PartInit,
  Score,
  ScoreBuilder,
  Technique,
  TimeSignature,
} from "@score-linter/score-model";
import { createScoreBuilder } from "@score-linter/score-model";

import { barlineKindOf, dynamicText, notesOf, tiePitches } from "./elements.js";

/**
 * 指摘を MuseScore の楽譜へ引き戻すための手がかり。ルールには渡さない。
 * 要素そのものは持たない — QML の GC が C++ 側の参照を保たず、あとで null になる。
 */
export interface MuseScoreOrigins {
  /** 添字 + 1 が小節の通し番号。範囲選択に使う、小節の最初と最後のセグメントの tick。 */
  measures: { firstSegmentTick: number; lastSegmentTick: number }[];
}

export interface MuseScoreRead {
  score: Score;
  origins: MuseScoreOrigins;
}

function readParts(score: MsScore): PartInit[] {
  const parts: PartInit[] = [];
  let covered = 0;
  (score.parts ?? []).forEach((part, i) => {
    const staffCount = trackToStaffIdx(part.endTrack) - trackToStaffIdx(part.startTrack);
    const name = part.longName ?? "";
    parts.push({
      // Part.musicXmlId は MusicXML から読み込んでいないスコアで一意に埋まるか
      // 確かめられていないので、並び順を識別子にする
      id: `part-${i}`,
      name: name.length > 0 ? name : `Staff ${covered + 1}`,
      staffCount,
    });
    covered += staffCount;
  });
  // パートの情報が取れない譜表は、1 譜表ずつのパートにする
  for (let staff = covered; staff < score.nstaves; staff++) {
    parts.push({ id: `staff-${staff}`, name: `Staff ${staff + 1}`, staffCount: 1 });
  }
  return parts;
}

const BRACKET_SYMBOL: Partial<Record<string, PartGroupSymbol>> = {
  NORMAL: "bracket",
  BRACE: "brace",
  SQUARE: "square",
  LINE: "line",
};

/** MuseScore は括弧を開始譜表に持たせるので、全譜表を 1 周すれば各括弧が 1 回ずつ拾える。 */
function readPartGroups(score: MsScore, helpers: ConnectedHelpers, builder: ScoreBuilder): void {
  const staves = score.staves ?? [];
  for (let i = 0; i < staves.length; i++) {
    const staff = staves[i];
    if (!staff) continue;
    const firstStaff = typeof staff.idx === "number" ? staff.idx : i;
    for (const bracket of staff.brackets ?? []) {
      const name = helpers.bracketTypeName(bracket.systemBracket);
      const symbol = name === null ? undefined : BRACKET_SYMBOL[name];
      if (!symbol || typeof bracket.bracketSpan !== "number") continue;
      builder.addPartGroup({ symbol, firstStaff, staffCount: bracket.bracketSpan });
    }
  }
}

function readTimeSignature(measure: MsMeasure): TimeSignature | null {
  const sig = getMeasureTimeSig(measure);
  const slash = sig.indexOf("/");
  if (slash <= 0) return null;
  const numerator = Number(sig.slice(0, slash));
  const denominator = Number(sig.slice(slash + 1));
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return null;
  if (numerator <= 0 || denominator <= 0) return null;
  return { numerator, denominator };
}

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

// 奏法の種類のうち、テキストと 1 対 1 に対応するもの。Natural（arco か ord.）・
// Mute（弦の con sord. か金管のミュート）・Open は 1 つに決まらないので入れない。
const TECHNIQUE_BY_PLAY_TECH: Partial<Record<PlayingTechniqueTypeName, Technique>> = {
  Pizzicato: "pizz",
  ColLegno: "col-legno",
  SulPonticello: "sul-pont",
  SulTasto: "sul-tasto",
};

function hintsOf(ann: EngravingItem, helpers: ConnectedHelpers): AnnotationHints | null {
  // 要素の述語はどれも EngravingItem への型ガードなので、偽の枝で ann が never に狭まる。
  // playTechType を読む枝を先に置く。
  if (isPlayTechAnnotation(ann)) {
    const name = helpers.playingTechniqueTypeName(ann.playTechType);
    const technique = name === null ? undefined : TECHNIQUE_BY_PLAY_TECH[name];
    return technique ? { technique } : {};
  }
  if (isTempo(ann)) {
    // getTempoBpm は Math.round(el.tempo * 60) なので、tempo が無いと NaN、null だと 0 になる
    const bpm = getTempoBpm(ann);
    return { kind: "tempo", bpm: finite(bpm) && bpm > 0 ? bpm : null };
  }
  if (isDynamic(ann)) return { kind: "dynamic" };
  if (isRehearsalMark(ann)) return { kind: "rehearsal" };
  if (isExpression(ann) || isStaffText(ann) || isSystemText(ann)) return {};
  // 歌詞やコードネームなど、ルールが扱わない注記
  return null;
}

function readAnnotations(
  seg: Segment,
  measure: number,
  helpers: ConnectedHelpers,
  builder: ScoreBuilder,
): void {
  for (const ann of seg.annotations ?? []) {
    const raw = getAnnotationText(ann);
    if (raw.length === 0) continue;
    const hints = hintsOf(ann, helpers);
    if (hints === null) continue;
    const staff = getAnnotationStaffIdx(ann);
    builder.addAnnotation({
      tick: seg.tick,
      measure,
      scope: staff >= 0 ? { type: "staff", staff } : { type: "score" },
      text: isDynamic(ann) ? dynamicText(raw) : raw,
      hints,
    });
  }
}

// elementAt は QML と C++ の境界を越えるので 1 track につき 1 回に抑える（走査時間は
// ほぼこの呼び出し回数で決まる）。配列を毎回作ると GC が増えるので使い回す。走査は同期で再入しない。
const trackElements: (EngravingItem | null)[] = [null, null, null, null];

function readStaff(
  seg: Segment,
  measure: number,
  staff: number,
  helpers: ConnectedHelpers,
  builder: ScoreBuilder,
): void {
  for (let voice = 0; voice < VOICES_PER_STAFF; voice++) {
    trackElements[voice] = seg.elementAt(staffVoiceToTrack(staff, voice));
  }

  for (let voice = 0; voice < VOICES_PER_STAFF; voice++) {
    const el = trackElements[voice];
    if (!isChord(el) && !isRest(el)) continue;
    // グレースノートは拍の位置を持たない
    if (isChord(el) && helpers.isGraceNote(el)) continue;

    const common = {
      tick: seg.tick,
      measure,
      duration: el.duration
        ? { numerator: el.duration.numerator, denominator: el.duration.denominator }
        : null,
      tuplet: !!el.tuplet,
    };
    if (!isChord(el)) {
      builder.addRest(staff, voice, common);
      continue;
    }
    builder.addChord(staff, voice, {
      ...common,
      notes: notesOf(el),
      articulations: getArticulationNames(el),
    });
    for (const note of el.notes ?? []) {
      const tie = note.tieForward;
      if (tie) builder.addTie({ staff, voice, ...getSpannerRange(tie), ...tiePitches(tie) });
      for (const spanner of note.spannerForward ?? []) {
        if (isHairpin(spanner)) builder.addHairpin({ staff, ...getHairpinRange(spanner) });
        else if (isSlur(spanner)) builder.addSlur({ staff, voice, ...getSpannerRange(spanner) });
      }
    }
  }

  for (let voice = 0; voice < VOICES_PER_STAFF; voice++) {
    const el = trackElements[voice];
    if (el && isBarLine(el)) {
      builder.addBarline(staff, {
        tick: seg.tick,
        measure,
        kind: barlineKindOf(helpers.barLineTypeName(el.barlineType)),
      });
      break;
    }
  }
}

/**
 * 実行中の MuseScore の楽譜から Score を作る。1 小節の読み取りに失敗しても、その小節を
 * 飛ばして続ける（小節は数えるので、以降の通し番号はずれない）。
 */
export function readMuseScore(helpers: ConnectedHelpers, msScore: MsScore): MuseScoreRead {
  const builder = createScoreBuilder(readParts(msScore));
  readPartGroups(msScore, helpers, builder);
  const origins: MuseScoreOrigins = { measures: [] };

  let serial = 0;
  let nextStart = 0;
  for (const m of iterateMeasures(msScore)) {
    serial++;
    const startTick = finite(m.tick?.ticks) ? m.tick.ticks : nextStart;
    const ticks = finite(m.ticks?.ticks) ? m.ticks.ticks : 0;
    nextStart = startTick + ticks;
    builder.addMeasure({
      label: finite(m.no) ? String(m.no + 1) : String(serial),
      startTick,
      ticks,
      timeSignature: readTimeSignature(m),
    });
    const first = m.firstSegment?.tick ?? startTick;
    origins.measures.push({
      firstSegmentTick: first,
      lastSegmentTick: m.lastSegment?.tick ?? first,
    });

    try {
      for (let seg: Segment | null = m.firstSegment; seg; seg = seg.nextInMeasure) {
        readAnnotations(seg, serial, helpers, builder);
        for (let staff = 0; staff < msScore.nstaves; staff++) {
          readStaff(seg, serial, staff, helpers, builder);
        }
      }
    } catch (error) {
      // 壊れた 1 小節のために楽譜全体の結果を失わない
      console.warn(`[ScoreLinter] ${serial} 小節目の読み取りに失敗: ${error}`);
    }
  }

  return { score: builder.finish(), origins };
}
