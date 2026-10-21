// JSON.stringify をそのまま通せる純データに保つ。Map・クラス・関数を入れると、
// プラグインのスナップショットと CLI の --dump-ir が壊れる。

export interface Fraction {
  numerator: number;
  denominator: number;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface Measure {
  /** 1 始まりの通し番号。位置（{@link Position.measure}）はこの番号で指す。 */
  serial: number;
  /** 楽譜に表示されている小節番号。アウフタクトや番号の付け直しで serial とずれる。 */
  label: string;
  startTick: number;
  ticks: number;
  timeSignature: TimeSignature | null;
}

export interface Part {
  id: string;
  name: string;
  /** このパートに属する譜表の番号（{@link Staff.index}）。昇順。 */
  staves: number[];
}

export interface Note {
  /** MIDI 音高。無音程の打楽器などは null。 */
  pitch: number | null;
  /** 綴り（tonal pitch class）。C = 14。 */
  tpc: number;
  /** 譜表上の位置。音部記号に応じた音名とオクターブを表す。 */
  line: number;
  accidentalShown: boolean;
}

interface VoiceEventBase {
  tick: number;
  measure: number;
  duration: Fraction | null;
  tuplet: boolean;
  fermata: boolean;
}

export interface Chord extends VoiceEventBase {
  type: "chord";
  notes: Note[];
  articulations: string[];
}

export interface Rest extends VoiceEventBase {
  type: "rest";
}

export type VoiceEvent = Chord | Rest;

export interface Voice {
  /** tick 昇順。 */
  events: VoiceEvent[];
}

export type BarlineKind =
  | "double"
  | "final"
  | "repeat-start"
  | "repeat-end"
  | "repeat-both"
  | "other";

export interface Barline {
  tick: number;
  measure: number;
  kind: BarlineKind;
}

/** 譜表に書かれた調号。移調楽器では記譜の調で、`Note.tpc` と同じ側の綴りになる。 */
export interface KeySignature {
  tick: number;
  measure: number;
  /** シャープの数が正、フラットの数が負。 */
  fifths: number;
}

export interface Staff {
  index: number;
  partId: string;
  /** 添字が声部番号。音符も休符も無い声部は空の events を持つ。 */
  voices: Voice[];
  /** tick 昇順。 */
  barlines: Barline[];
  /** 書かれている調号。システムの頭で繰り返し表示される分は含まない。tick 昇順。 */
  keySignatures: KeySignature[];
}

export interface Slur {
  staff: number;
  voice: number;
  startTick: number;
  endTick: number;
}

export interface Tie {
  staff: number;
  voice: number;
  startTick: number;
  endTick: number;
  startPitch: number | null;
  endPitch: number | null;
}

export interface Hairpin {
  staff: number;
  startTick: number;
  endTick: number;
}

export type PartGroupSymbol = "bracket" | "square" | "brace" | "line";

/** システムブラケット 1 本。`firstStaff` から `staffCount` 本の連続する譜表を覆う。 */
export interface PartGroup {
  symbol: PartGroupSymbol;
  firstStaff: number;
  staffCount: number;
}

export type AnnotationScope =
  | { type: "staff"; staff: number }
  | { type: "part"; partId: string }
  | { type: "score" };

/**
 * 注記の種類。楽譜の記法の区別で、ソースの要素の種類ではない。
 * `text` は自由テキスト（奏法・表情・反復の指示など）。
 */
export type AnnotationKind = "text" | "tempo" | "dynamic" | "rehearsal";

export type Technique =
  | "pizz"
  | "arco"
  | "con-sord"
  | "senza-sord"
  | "solo"
  | "tutti"
  | "div"
  | "unis"
  | "sul-tasto"
  | "sul-pont"
  | "col-legno"
  | "ord"
  | "natural"
  | "mute"
  | "open"
  | "una-corda"
  | "tre-corde"
  | "pres-de-la-table";

export type RepeatMark =
  | "segno"
  | "coda"
  | "fine"
  | "dal-segno"
  | "da-capo"
  | "al-coda"
  | "al-fine"
  | "to-coda";

export type Directive =
  | { type: "technique"; technique: Technique }
  /** `mark` は修飾語を除いた記号（`f`・`mp` …）。「f espr.」は mark `f`・modifier `espr.`。 */
  | { type: "dynamic"; mark: string; modifier: string }
  | { type: "dynamic-change"; direction: "crescendo" | "diminuendo" }
  | { type: "tempo"; bpm: number | null; word: string | null }
  /** `gradual` は rit. や accel. のような漸次的な変化、`reset` は a tempo のような解除。 */
  | { type: "tempo-change"; change: "gradual" | "reset" }
  | { type: "repeat"; mark: RepeatMark }
  | { type: "rehearsal"; label: string };

export interface Annotation {
  kind: AnnotationKind;
  tick: number;
  measure: number;
  scope: AnnotationScope;
  /** 楽譜に書かれたままのテキスト。 */
  text: string;
  directives: Directive[];
}

export interface Score {
  parts: Part[];
  /** 添字が {@link Staff.index}。 */
  staves: Staff[];
  /** 添字 + 1 が {@link Measure.serial}。 */
  measures: Measure[];
  partGroups: PartGroup[];
  /** ソースから読んだ順。 */
  annotations: Annotation[];
  slurs: Slur[];
  ties: Tie[];
  hairpins: Hairpin[];
}

/**
 * 楽譜の中の位置。`staff` を持たない位置は楽譜全体に対する指摘になる。
 * パート名と表示上の小節番号は持たない — 表示は lint-app が Score から引く。
 */
export interface Position {
  staff?: number;
  measure: number;
  tick: number;
}
