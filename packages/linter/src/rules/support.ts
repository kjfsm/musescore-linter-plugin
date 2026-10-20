import type {
  Annotation,
  AnnotationKind,
  AnnotationScope,
  Directive,
  Score,
  Technique,
} from "@score-linter/score-model";
import { chordTicks, restTicks } from "@score-linter/score-model";

export function ofKind(annotations: readonly Annotation[], kind: AnnotationKind): Annotation[] {
  return annotations.filter((a) => a.kind === kind);
}

export function directiveOf<T extends Directive["type"]>(
  annotation: Annotation,
  type: T,
): Extract<Directive, { type: T }> | undefined {
  return annotation.directives.find((d): d is Extract<Directive, { type: T }> => d.type === type);
}

export function techniqueOf(annotation: Annotation): Technique | undefined {
  return directiveOf(annotation, "technique")?.technique;
}

/** 指摘を置く譜表。パートに付いた注記はパートの最初の譜表、楽譜全体の注記は譜表なし。 */
export function staffOfScope(score: Score, scope: AnnotationScope): number | undefined {
  if (scope.type === "staff") return scope.staff;
  if (scope.type === "part") return score.parts.find((p) => p.id === scope.partId)?.staves[0];
  return undefined;
}

/**
 * staff → 比較グループのキーを返す関数。選ばれた種類の括弧のうち、その譜表を覆う最小のもの
 * （入れ子なら内側）を採る。どの括弧にも入らない譜表は null で、比較から外す。
 * 選ばれた種類の括弧が 1 本も無ければ関数ごと null — 呼び出し側は全パート比較に戻る。
 */
export function bracketGroupKeyOf(
  score: Score,
  symbols: readonly string[],
): ((staff: number) => string | null) | null {
  const wanted = new Set(symbols);
  const groups = score.partGroups.filter((g) => wanted.has(g.symbol) && g.staffCount >= 2);
  if (groups.length === 0) return null;

  // 小さい括弧から割り当て、先に入ったもの（＝より内側）を優先する
  const sorted = [...groups].sort(
    (a, b) => a.staffCount - b.staffCount || b.firstStaff - a.firstStaff,
  );
  const keyByStaff = new Map<number, string>();
  for (const g of sorted) {
    const key = `${g.firstStaff}:${g.staffCount}`;
    for (let i = g.firstStaff; i < g.firstStaff + g.staffCount; i++) {
      if (!keyByStaff.has(i)) keyByStaff.set(i, key);
    }
  }
  return (staff) => keyByStaff.get(staff) ?? null;
}

export interface RestEndpoint {
  staff: number;
  endpoint: "開始" | "終了";
  tick: number;
  detail: Record<string, unknown>;
}

/**
 * スパナーの端点のうち、その譜表で休符だけがあり和音が無い位置にあるもの。
 * スパナーの端点は音符に掛かるのが原則で、休符上の端点は浄書ミスであることが多い。
 */
export function restOnlyEndpoints(
  score: Score,
  spans: readonly { staff: number; startTick: number; endTick: number }[],
  kind: "hairpin" | "slur",
): RestEndpoint[] {
  const onRestOnly = (staff: number, tick: number): boolean =>
    restTicks(score, staff).has(tick) && !chordTicks(score, staff).has(tick);

  const hits: RestEndpoint[] = [];
  for (const span of spans) {
    const detail = { kind, startTick: span.startTick, endTick: span.endTick };
    if (onRestOnly(span.staff, span.startTick)) {
      hits.push({ staff: span.staff, endpoint: "開始", tick: span.startTick, detail });
    }
    if (onRestOnly(span.staff, span.endTick)) {
      hits.push({ staff: span.staff, endpoint: "終了", tick: span.endTick, detail });
    }
  }
  return hits;
}
