import { type AnnotationHints, interpretAnnotation } from "./interpret.js";
import { normalizePartGroups } from "./partGroups.js";
import { stableSortBy } from "./sort.js";
import type {
  AnnotationScope,
  Barline,
  Chord,
  Hairpin,
  KeySignature,
  Measure,
  PartGroup,
  Rest,
  Score,
  Slur,
  Staff,
  Tie,
} from "./types.js";

const byTick = (a: { tick: number }, b: { tick: number }): number => a.tick - b.tick;

export interface PartInit {
  id: string;
  name: string;
  staffCount: number;
}

export type ChordInit = Omit<Chord, "type">;
export type RestInit = Omit<Rest, "type">;

export interface AnnotationInit {
  tick: number;
  measure: number;
  scope: AnnotationScope;
  text: string;
  hints?: AnnotationHints;
}

export interface ScoreBuilder {
  addMeasure(measure: Omit<Measure, "serial">): Measure;
  addChord(staff: number, voice: number, chord: ChordInit): void;
  addRest(staff: number, voice: number, rest: RestInit): void;
  addBarline(staff: number, barline: Barline): void;
  addKeySignature(staff: number, key: KeySignature): void;
  addAnnotation(annotation: AnnotationInit): void;
  addSlur(slur: Slur): void;
  addTie(tie: Tie): void;
  addHairpin(hairpin: Hairpin): void;
  addPartGroup(group: PartGroup): void;
  finish(): Score;
}

/**
 * Score を 1 要素ずつ組み立てる。reader は楽譜を走査しながら足していくので、
 * 並べ替えと括弧の正規化は {@link ScoreBuilder.finish} にまとめて置く。
 * 読み込み口が違っても Score の並びの約束がずれないよう、どの reader もここを通す。
 */
export function createScoreBuilder(parts: readonly PartInit[]): ScoreBuilder {
  const score: Score = {
    parts: [],
    staves: [],
    measures: [],
    partGroups: [],
    annotations: [],
    slurs: [],
    ties: [],
    hairpins: [],
  };
  for (const init of parts) {
    const first = score.staves.length;
    const staves: number[] = [];
    for (let i = 0; i < init.staffCount; i++) {
      staves.push(first + i);
      score.staves.push({
        index: first + i,
        partId: init.id,
        voices: [],
        barlines: [],
        keySignatures: [],
      });
    }
    score.parts.push({ id: init.id, name: init.name, staves });
  }

  const staffAt = (index: number): Staff => {
    const staff = score.staves[index];
    if (!staff) throw new Error(`譜表 ${index} はありません（譜表は ${score.staves.length} 本）`);
    return staff;
  };
  const voiceOf = (staff: number, voice: number) => {
    const voices = staffAt(staff).voices;
    while (voices.length <= voice) voices.push({ events: [] });
    return voices[voice]!;
  };

  return {
    addMeasure(measure) {
      const added = { serial: score.measures.length + 1, ...measure };
      score.measures.push(added);
      return added;
    },
    addChord(staff, voice, chord) {
      voiceOf(staff, voice).events.push({ type: "chord", ...chord });
    },
    addRest(staff, voice, rest) {
      voiceOf(staff, voice).events.push({ type: "rest", ...rest });
    },
    addBarline(staff, barline) {
      staffAt(staff).barlines.push(barline);
    },
    addKeySignature(staff, key) {
      staffAt(staff).keySignatures.push(key);
    },
    addAnnotation({ tick, measure, scope, text, hints }) {
      score.annotations.push({ tick, measure, scope, text, ...interpretAnnotation(text, hints) });
    },
    addSlur: (slur) => score.slurs.push(slur),
    addTie: (tie) => score.ties.push(tie),
    addHairpin: (hairpin) => score.hairpins.push(hairpin),
    addPartGroup: (group) => score.partGroups.push(group),
    finish() {
      for (const staff of score.staves) {
        for (const voice of staff.voices) voice.events = stableSortBy(voice.events, byTick);
        staff.barlines = stableSortBy(staff.barlines, byTick);
        staff.keySignatures = stableSortBy(staff.keySignatures, byTick);
      }
      score.partGroups = normalizePartGroups(score.partGroups);
      return score;
    },
  };
}
