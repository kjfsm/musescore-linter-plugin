import { leadingTempoWord } from "./tempoWords.ts";
import type { AnnotationKind, Directive, RepeatMark, Technique } from "./types.ts";

export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

const TECHNIQUE_BY_TEXT: Record<string, Technique> = {
  "pizz.": "pizz",
  pizz: "pizz",
  pizzicato: "pizz",
  arco: "arco",
  "con sord.": "con-sord",
  "con sord": "con-sord",
  "con sordino": "con-sord",
  "senza sord.": "senza-sord",
  "senza sord": "senza-sord",
  "senza sordino": "senza-sord",
  solo: "solo",
  soli: "solo",
  tutti: "tutti",
  "div.": "div",
  div: "div",
  divisi: "div",
  "unis.": "unis",
  unis: "unis",
  unison: "unis",
  unisono: "unis",
  "sul tasto": "sul-tasto",
  "sul tasto.": "sul-tasto",
  "sul pont.": "sul-pont",
  "sul pont": "sul-pont",
  "sul ponticello": "sul-pont",
  "s.p.": "sul-pont",
  "sp.": "sul-pont",
  "con legno": "col-legno",
  "col legno": "col-legno",
  "ord.": "ord",
  ord: "ord",
  ordinario: "ord",
  "modo ordinario": "ord",
  naturale: "natural",
  "nat.": "natural",
  mute: "mute",
  "con mute": "mute",
  "straight mute": "mute",
  "cup mute": "mute",
  "harmon mute": "mute",
  harmon: "mute",
  "bucket mute": "mute",
  plunger: "mute",
  stopped: "mute",
  chiuso: "mute",
  "+": "mute",
  open: "open",
  "senza mute": "open",
  "una corda": "una-corda",
  "u.c.": "una-corda",
  "tre corde": "tre-corde",
  "tutte le corde": "tre-corde",
  "t.c.": "tre-corde",
  "près de la table": "pres-de-la-table",
  "pres de la table": "pres-de-la-table",
  "p.d.l.t.": "pres-de-la-table",
  pdlt: "pres-de-la-table",
};

const DYNAMIC_CHANGE_BY_TEXT: Record<string, "crescendo" | "diminuendo"> = {
  "cresc.": "crescendo",
  cresc: "crescendo",
  crescendo: "crescendo",
  "dim.": "diminuendo",
  dim: "diminuendo",
  diminuendo: "diminuendo",
  "decresc.": "diminuendo",
  decresc: "diminuendo",
  decrescendo: "diminuendo",
  "dimin.": "diminuendo",
};

const GRADUAL_TEMPO_RE =
  /(^|[^a-z])(rit\b|rit\.|ritard|rall\b|rall\.|rallent|accel|allarg|stringend|string\.|slentand|smorz|caland)/;
const TEMPO_RESET_RE =
  /(a tempo|tempo primo|tempo 1|tempo i\b|l'istesso|istesso tempo|in tempo|a battuta|tempo giusto)/;

const DYNAMIC_MARK_RE = /^(?:p{1,6}|f{1,6}|m[pf]|s?f{1,2}z?p{0,2}|r?fz|rf|pf|n)$/;

function parseDynamic(norm: string): { mark: string; modifier: string } | null {
  const words = norm.split(" ");
  const at = words.findIndex((w) => DYNAMIC_MARK_RE.test(w));
  if (at === -1) return null;
  const modifier = words.filter((_, i) => i !== at).join(" ");
  return { mark: words[at]!, modifier };
}

function repeatMarksOf(norm: string): RepeatMark[] {
  const marks: RepeatMark[] = [];
  if (/\bd\.?\s*s\.?/.test(norm) || norm.includes("dal segno")) marks.push("dal-segno");
  if (/\bd\.?\s*c\.?/.test(norm) || norm.includes("da capo")) marks.push("da-capo");
  if (norm === "segno" || norm === "$" || norm.includes("𝅇")) marks.push("segno");
  if (norm === "coda" || norm.includes("𝅌")) marks.push("coda");
  if (norm === "fine" || norm === "fine.") marks.push("fine");
  if (norm.includes("al coda")) marks.push("al-coda");
  if (norm.includes("al fine")) marks.push("al-fine");
  if (norm.includes("to coda")) marks.push("to-coda");
  return marks;
}

/**
 * ソースが要素の構造として持っている手がかり。テキストからの推測より優先する。
 * 例: MusicXML の `<sound tempo>`・`<dynamics>` の子要素、MuseScore の奏法の種類。
 *
 * ただし `technique` だけはテキストで読めなかったときに使う。MuseScore の奏法の種類は
 * テキストより粗く、弦の con sord. と金管のミュートがどちらも Mute になる。
 */
export interface AnnotationHints {
  kind?: AnnotationKind;
  bpm?: number | null;
  dynamic?: { mark: string; modifier: string };
  technique?: Technique;
  repeats?: readonly RepeatMark[];
}

function validBpm(bpm: number | null | undefined): number | null {
  return typeof bpm === "number" && Number.isFinite(bpm) && bpm > 0 ? bpm : null;
}

/**
 * 注記のテキストを解釈して、種類と Directive を決める。
 *
 * 種類の手がかりが無い自由テキストでも、テンポ語で始まればテンポ表記にする。
 * MusicXML の `<words>` だけで書かれた「Allegro」と MuseScore のテンポテキストを
 * 同じものとして扱うため。
 */
export function interpretAnnotation(
  text: string,
  hints: AnnotationHints = {},
): { kind: AnnotationKind; directives: Directive[] } {
  const norm = normalizeText(text);
  const tempoWord = leadingTempoWord(norm);
  const kind = hints.kind ?? (tempoWord !== null ? "tempo" : "text");
  const directives: Directive[] = [];

  if (kind === "tempo")
    directives.push({ type: "tempo", bpm: validBpm(hints.bpm), word: tempoWord });
  if (kind === "rehearsal") directives.push({ type: "rehearsal", label: text.trim() });
  if (kind === "dynamic") {
    const dynamic = hints.dynamic ?? parseDynamic(norm);
    if (dynamic) directives.push({ type: "dynamic", ...dynamic });
  } else if (kind === "text" && DYNAMIC_MARK_RE.test(norm)) {
    // 種類はテキストのまま残す。強弱記号として数えると、再生に効かない記号を
    // 冒頭の強弱記号などのチェックが「ある」とみなしてしまう。
    directives.push({ type: "dynamic", mark: norm, modifier: "" });
  }

  const technique = TECHNIQUE_BY_TEXT[norm] ?? hints.technique;
  if (technique) directives.push({ type: "technique", technique });

  const direction = DYNAMIC_CHANGE_BY_TEXT[norm];
  if (direction) directives.push({ type: "dynamic-change", direction });

  if (GRADUAL_TEMPO_RE.test(norm)) directives.push({ type: "tempo-change", change: "gradual" });
  if (TEMPO_RESET_RE.test(norm)) directives.push({ type: "tempo-change", change: "reset" });

  const marks = [...(hints.repeats ?? [])];
  for (const mark of repeatMarksOf(norm)) if (!marks.includes(mark)) marks.push(mark);
  for (const mark of marks) directives.push({ type: "repeat", mark });

  return { kind, directives };
}
