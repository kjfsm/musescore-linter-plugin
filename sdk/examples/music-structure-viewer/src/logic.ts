import {
  getAnnotationText,
  getClefTypeAt,
  getKeySigAt,
  getMeasureEndBarlineType,
  getMeasureRepeatInfo,
  getMeasureTimeSig,
  getNoteTypeName,
  getTempoBpm,
  isChord,
  isDynamic,
  isRest,
  iterateMeasureSegments,
  iterateMeasures,
  parseDynamicText,
} from "@kjfsm/musescore-plugin-sdk-helpers";
import type {
  BarLineType,
  BarLineTypeEnum,
  BracketType,
  Chord,
  ClefType,
  Key,
  NoteTypeEnum,
  Score,
} from "@kjfsm/musescore-plugin-sdk-types";

const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export function midiToName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  return `${PITCH_NAMES[pitch % 12] ?? "?"}${octave}`;
}

export function barlineTypeName(value: BarLineType, barLineType: BarLineTypeEnum): string {
  for (const [key, val] of Object.entries(barLineType)) {
    if (val === value) return key;
  }
  return `Unknown(${value})`;
}

export interface StructureElement {
  type: "Chord" | "Rest";
  dur: string;
  notes?: string[];
  noteType?: string;
}

export interface VoiceInfo {
  voice: number;
  elements: StructureElement[];
}

export interface AnnotationInfo {
  type: string;
  text: string;
  tick: number;
}

export interface TempoChangeInfo {
  bpm: number;
  tick: number;
}

export interface ClefChange {
  tick: number;
  type: ClefType;
}

export interface StaveInfo {
  staffIdx: number;
  voices: VoiceInfo[];
  annotations?: AnnotationInfo[];
  clefChanges?: ClefChange[];
}

export interface MeasureInfo {
  measure: number;
  timeSig: string;
  barline: string;
  tempoChanges?: TempoChangeInfo[];
  keySig?: Key;
  repeatCount?: number;
  irregular?: boolean;
  staves: StaveInfo[];
}

export interface BracketGroup {
  firstStaff: number;
  lastStaff: number;
  type: BracketType;
}

export interface PartInfo {
  name: string;
  shortName: string;
  instrumentId: string;
  nstaves: number;
}

export interface ScoreMeta {
  title: string;
  subtitle: string;
  composer: string;
  lyricist: string;
  nstaves: number;
  nmeasures: number;
  ntracks: number;
  durationSec: number;
  keySig: Key;
}

export interface ScoreStructure {
  score: ScoreMeta;
  parts: PartInfo[];
  bracketGroups: BracketGroup[];
  measures: MeasureInfo[];
}

function fractionStr(frac: { str: string } | null | undefined): string {
  return frac?.str ?? "?";
}

export function buildStructure(
  score: Score | null,
  noteType: NoteTypeEnum,
  barLineType: BarLineTypeEnum,
): string {
  if (!score) {
    return JSON.stringify({ error: "no score is open" }, null, 2);
  }

  const meta: ScoreMeta = {
    title: score.title || score.metaTag("workTitle") || "(untitled)",
    subtitle: score.metaTag("subtitle") || "",
    composer: score.composer || score.metaTag("composer") || "",
    lyricist: score.lyricist || score.metaTag("lyricist") || "",
    nstaves: score.nstaves,
    nmeasures: score.nmeasures,
    ntracks: score.ntracks,
    durationSec: score.duration,
    keySig: score.keysig,
  };

  const parts: PartInfo[] = score.parts.map((p) => ({
    name: p.partName || p.longName || "",
    shortName: p.shortName || "",
    instrumentId: p.instrumentId || "",
    nstaves: p.staves.length,
  }));

  // Collect bracket groups: bracket info lives on EngravingItem elements in staff.brackets
  const bracketGroups: BracketGroup[] = [];
  for (let si = 0; si < (score.staves?.length ?? 0); si++) {
    const staff = score.staves[si];
    if (!staff) continue;
    for (const bracket of staff.brackets) {
      if (bracket.bracketSpan > 0) {
        bracketGroups.push({
          firstStaff: si,
          lastStaff: si + bracket.bracketSpan - 1,
          type: bracket.systemBracket,
        });
      }
    }
  }

  const measures: MeasureInfo[] = [];
  let measureIdx = 0;
  let lastKeySig: Key | undefined;

  for (const measure of iterateMeasures(score)) {
    measureIdx++;

    const timeSig = getMeasureTimeSig(measure);
    const repeatInfo = getMeasureRepeatInfo(measure);
    const endBarlineType = getMeasureEndBarlineType(measure);
    const barline =
      endBarlineType != null ? barlineTypeName(endBarlineType, barLineType) : "Normal";

    const tempoChanges: TempoChangeInfo[] = [];
    const staffAnnotationMap = new Map<number, AnnotationInfo[]>();
    const staffClefChanges = new Map<number, ClefChange[]>();
    let measureKeySig: Key | undefined;

    for (const seg of iterateMeasureSegments(measure)) {
      // Annotations: TempoText, Dynamic, StaffText, etc.
      for (const ann of seg.annotations) {
        // Use name check instead of isTempo() type predicate to avoid 'never' narrowing
        // (isTempo: EngravingItem → el is EngravingItem makes the else branch unreachable).
        if (ann.name === "Tempo" || ann.name === "TempoText") {
          tempoChanges.push({ bpm: getTempoBpm(ann), tick: seg.tick });
          continue;
        }
        const raw = getAnnotationText(ann);
        const text = isDynamic(ann) ? parseDynamicText(raw) : raw;
        if (text) {
          const si = ann.staffIdx >= 0 ? ann.staffIdx : 0;
          const arr = staffAnnotationMap.get(si) ?? [];
          arr.push({ type: ann.name, text, tick: seg.tick });
          staffAnnotationMap.set(si, arr);
        }
      }

      // KeySig changes (track staff 0 for simplicity; key changes are score-wide)
      if (measureKeySig === undefined) {
        const ks = getKeySigAt(seg, 0);
        if (ks !== null) measureKeySig = ks;
      }

      // Clef changes per staff
      for (let staffIdx = 0; staffIdx < score.nstaves; staffIdx++) {
        const clefType = getClefTypeAt(seg, staffIdx);
        if (clefType !== null) {
          const arr = staffClefChanges.get(staffIdx) ?? [];
          arr.push({ tick: seg.tick, type: clefType });
          staffClefChanges.set(staffIdx, arr);
        }
      }
    }

    // Emit keySig only when it changes
    let keySigEntry: Key | undefined;
    if (measureKeySig !== undefined && measureKeySig !== lastKeySig) {
      keySigEntry = measureKeySig;
      lastKeySig = measureKeySig;
    }

    // Collect notes / rests per staff / voice
    const staves: StaveInfo[] = [];

    for (let staffIdx = 0; staffIdx < score.nstaves; staffIdx++) {
      const voiceMap = new Map<number, StructureElement[]>();

      for (const seg of iterateMeasureSegments(measure)) {
        for (let voice = 0; voice < 4; voice++) {
          const track = staffIdx * 4 + voice;
          const el = seg.elementAt(track);
          if (!el) continue;

          let entry: StructureElement | undefined;

          if (isChord(el)) {
            const chord = el as Chord;
            entry = {
              type: "Chord",
              dur: fractionStr(chord.duration),
              notes: chord.notes.map((n) => midiToName(n.pitch)),
              ...(chord.noteType !== noteType.NORMAL && {
                noteType: getNoteTypeName(chord.noteType, noteType),
              }),
            };
          } else if (isRest(el)) {
            entry = { type: "Rest", dur: fractionStr(el.duration) };
          }

          if (entry !== undefined) {
            const arr = voiceMap.get(voice) ?? [];
            arr.push(entry);
            voiceMap.set(voice, arr);
          }
        }
      }

      const annotations = staffAnnotationMap.get(staffIdx);
      const clefChanges = staffClefChanges.get(staffIdx);
      if (
        voiceMap.size > 0 ||
        (annotations !== undefined && annotations.length > 0) ||
        (clefChanges !== undefined && clefChanges.length > 0)
      ) {
        const voices = [...voiceMap.entries()]
          .sort(([a], [b]) => a - b)
          .map(([voice, elements]) => ({ voice, elements }));
        staves.push({
          staffIdx,
          voices,
          ...(annotations !== undefined && annotations.length > 0 && { annotations }),
          ...(clefChanges !== undefined && clefChanges.length > 0 && { clefChanges }),
        });
      }
    }

    measures.push({
      measure: measureIdx,
      timeSig,
      barline,
      ...(tempoChanges.length > 0 && { tempoChanges }),
      ...(keySigEntry !== undefined && { keySig: keySigEntry }),
      ...(repeatInfo.repeatCount > 1 && { repeatCount: repeatInfo.repeatCount }),
      ...(measure.irregular && { irregular: true }),
      staves,
    });
  }

  const structure: ScoreStructure = { score: meta, parts, bracketGroups, measures };
  return JSON.stringify(structure, null, 2);
}

export function run(
  score: Score | null,
  noteType: NoteTypeEnum,
  barLineType: BarLineTypeEnum,
): void {
  const json = buildStructure(score, noteType, barLineType);
  console.log(json);
}
