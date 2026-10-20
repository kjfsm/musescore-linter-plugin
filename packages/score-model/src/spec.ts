import { createScoreBuilder } from "./builder.js";
import { TICKS_PER_WHOLE } from "./constants.js";
import type { AnnotationHints } from "./interpret.js";
import type {
  AnnotationScope,
  BarlineKind,
  Fraction,
  Hairpin,
  Measure,
  Note,
  PartGroup,
  Score,
  Slur,
  Tie,
} from "./types.js";

export interface PartSpec {
  id?: string;
  name?: string;
  staffCount?: number;
}

export interface MeasureSpec {
  label?: string;
  /** 省略すると拍子どおりの長さ。 */
  ticks?: number;
  /** `[分子, 分母]`。`null` で拍子なし。省略すると 4/4。 */
  timeSignature?: [number, number] | null;
}

interface PlacedSpec {
  tick?: number;
  /** 省略すると tick を含む小節。小節を宣言していなければ 1。 */
  measure?: number;
}

export interface VoiceEventSpec extends PlacedSpec {
  staff?: number;
  voice?: number;
  duration?: Fraction | null;
  tuplet?: boolean;
}

export interface ChordSpec extends VoiceEventSpec {
  notes?: Note[];
  articulations?: string[];
}

export interface AnnotationSpec extends PlacedSpec, AnnotationHints {
  /** `staff` も `partId` も省略すると楽譜全体に付く。 */
  staff?: number;
  partId?: string;
  text: string;
}

export interface BarlineSpec extends PlacedSpec {
  staff?: number;
  kind: BarlineKind;
}

export interface ScoreSpec {
  /** 省略すると 1 譜表のパートが 1 つ。 */
  parts?: PartSpec[];
  measures?: MeasureSpec[];
  chords?: ChordSpec[];
  rests?: VoiceEventSpec[];
  annotations?: AnnotationSpec[];
  barlines?: BarlineSpec[];
  slurs?: (Partial<Omit<Slur, "startTick" | "endTick">> & Pick<Slur, "startTick" | "endTick">)[];
  ties?: (Partial<Omit<Tie, "startTick" | "endTick">> & Pick<Tie, "startTick" | "endTick">)[];
  hairpins?: (Partial<Omit<Hairpin, "startTick" | "endTick">> &
    Pick<Hairpin, "startTick" | "endTick">)[];
  partGroups?: PartGroup[];
}

/** 小さな楽譜を宣言から組み立てる。ルールのテストで、要る要素だけを書くために使う。 */
export function buildScore(spec: ScoreSpec = {}): Score {
  const parts = (spec.parts ?? [{}]).map((p, i) => ({
    id: p.id ?? `P${i + 1}`,
    name: p.name ?? `Part ${i + 1}`,
    staffCount: p.staffCount ?? 1,
  }));
  const builder = createScoreBuilder(parts);

  const measures: Measure[] = [];
  let startTick = 0;
  for (const m of spec.measures ?? []) {
    const sig = m.timeSignature === undefined ? ([4, 4] as const) : m.timeSignature;
    const ticks = m.ticks ?? (sig ? (TICKS_PER_WHOLE * sig[0]) / sig[1] : TICKS_PER_WHOLE);
    measures.push(
      builder.addMeasure({
        label: m.label ?? String(measures.length + 1),
        startTick,
        ticks,
        timeSignature: sig ? { numerator: sig[0], denominator: sig[1] } : null,
      }),
    );
    startTick += ticks;
  }

  const place = (p: PlacedSpec): { tick: number; measure: number } => {
    const tick = p.tick ?? 0;
    if (p.measure !== undefined) return { tick, measure: p.measure };
    let serial = 1;
    for (const m of measures) if (m.startTick <= tick) serial = m.serial;
    return { tick, measure: serial };
  };
  const common = (e: VoiceEventSpec) => ({
    ...place(e),
    duration: e.duration ?? null,
    tuplet: e.tuplet ?? false,
  });

  for (const c of spec.chords ?? []) {
    builder.addChord(c.staff ?? 0, c.voice ?? 0, {
      ...common(c),
      notes: c.notes ?? [],
      articulations: c.articulations ?? [],
    });
  }
  for (const r of spec.rests ?? []) builder.addRest(r.staff ?? 0, r.voice ?? 0, common(r));
  for (const b of spec.barlines ?? []) {
    builder.addBarline(b.staff ?? 0, { ...place(b), kind: b.kind });
  }
  for (const a of spec.annotations ?? []) {
    const { staff, partId, text, tick: _tick, measure: _measure, ...hints } = a;
    const scope: AnnotationScope =
      staff !== undefined
        ? { type: "staff", staff }
        : partId !== undefined
          ? { type: "part", partId }
          : { type: "score" };
    builder.addAnnotation({ ...place(a), scope, text, hints });
  }
  for (const s of spec.slurs ?? []) builder.addSlur({ staff: 0, voice: 0, ...s });
  for (const t of spec.ties ?? []) {
    builder.addTie({ staff: 0, voice: 0, startPitch: null, endPitch: null, ...t });
  }
  for (const h of spec.hairpins ?? []) builder.addHairpin({ staff: 0, ...h });
  for (const g of spec.partGroups ?? []) builder.addPartGroup(g);

  return builder.finish();
}
