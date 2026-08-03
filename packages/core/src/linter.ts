import { getAll } from "./checkerRegistry.js";
import { CANONICAL } from "./enumRegistry.js";
import { compareIssues } from "./issue.js";
import { make } from "./logger.js";
import { createPerf } from "./perf.js";
import type { Checker, IRDerived, Issue, LintEvent, LintIR } from "./types.js";

const log = make("linter");

// checker ごとの内訳を計測する。既定では無効（setPerfEnabled(true) で有効化）。
const perf = createPerf("checkers");

/** 直近の runAllCheckers の計測結果。計測が無効なら空文字列。 */
export function getCheckerPerfReport(): string {
  return perf.report();
}

export function ensureDerived(ir: LintIR): void {
  if (!ir?.events) return;
  if (ir.derived?._eventsCount === ir.events.length) return;

  const canonical = ir.registry?.canonical ?? CANONICAL;
  const derived: IRDerived = {
    _eventsCount: ir.events.length,
    firstChordByStaff: {},
    annotationIdsByTick: {},
    globalAnnotationIdsByTick: {},
    articulationsByChordId: {},
    slursByStaff: {},
    tiesByStaff: {},
    rhythmByStaffMeasure: {},
    chordsByStaffMeasure: {},
  };

  const chordKind = canonical.elementKinds.CHORD;
  const chordIds = ir.index?.byKind?.[chordKind] ?? [];
  for (const id of chordIds) {
    const ev = ir.events[id];
    if (ev.staffIdx < 0) continue;
    const existing = derived.firstChordByStaff[ev.staffIdx];
    if (
      !existing ||
      ev.tick < existing.tick ||
      (ev.tick === existing.tick && ev.measure < existing.measure)
    ) {
      derived.firstChordByStaff[ev.staffIdx] = {
        tick: ev.tick,
        measure: ev.measure,
      };
    }
  }

  const dynamicKind = canonical.elementKinds.DYNAMIC;
  for (const tick of Object.keys(ir.index?.byTick ?? {})) {
    const ids = ir.index.byTick[tick];
    const annotationIds = ids.filter((id) => {
      const e = ir.events[id];
      return e.type === "text" || e.kind === dynamicKind;
    });
    if (annotationIds.length > 0) derived.annotationIdsByTick[tick] = annotationIds;
  }

  const globalIds = ir.index?.byStaff?.["-1"] ?? [];
  for (const id of globalIds) {
    const gev = ir.events[id];
    const k = String(gev.tick);
    if (!derived.globalAnnotationIdsByTick[k]) derived.globalAnnotationIdsByTick[k] = [];
    derived.globalAnnotationIdsByTick[k].push(gev.id);
  }

  for (const id of chordIds) {
    const aev = ir.events[id];
    if (aev.articulations && aev.articulations.length > 0) {
      derived.articulationsByChordId[aev.id] = aev.articulations;
    }
    if (aev.staffIdx < 0) continue;
    const chordKey = `${aev.staffIdx}:${aev.measure}:${aev.voice}`;
    if (!derived.chordsByStaffMeasure[chordKey]) derived.chordsByStaffMeasure[chordKey] = [];
    derived.chordsByStaffMeasure[chordKey].push(aev);
  }
  for (const key of Object.keys(derived.chordsByStaffMeasure)) {
    derived.chordsByStaffMeasure[key].sort((a, b) => a.tick - b.tick);
  }

  for (const slur of ir.meta?.slurs ?? []) {
    if (!derived.slursByStaff[slur.staffIdx]) derived.slursByStaff[slur.staffIdx] = [];
    derived.slursByStaff[slur.staffIdx].push(slur);
  }
  for (const k of Object.keys(derived.slursByStaff)) {
    derived.slursByStaff[Number(k)].sort((a, b) => a.startTick - b.startTick);
  }

  for (const tie of ir.meta?.ties ?? []) {
    if (!derived.tiesByStaff[tie.staffIdx]) derived.tiesByStaff[tie.staffIdx] = [];
    derived.tiesByStaff[tie.staffIdx].push(tie);
  }
  for (const k of Object.keys(derived.tiesByStaff)) {
    derived.tiesByStaff[Number(k)].sort((a, b) => a.startTick - b.startTick);
  }

  const restKind = canonical.elementKinds.REST;
  const rhythmGroups: Record<string, LintEvent[]> = {};
  for (const id of [...chordIds, ...(ir.index?.byKind?.[restKind] ?? [])]) {
    const rev = ir.events[id];
    if (rev.staffIdx < 0) continue;
    const key = `${rev.staffIdx}:${rev.measure}:${rev.voice}`;
    if (!rhythmGroups[key]) rhythmGroups[key] = [];
    rhythmGroups[key].push(rev);
  }
  for (const key of Object.keys(rhythmGroups)) {
    const evs = rhythmGroups[key].sort((a, b) => a.tick - b.tick);
    derived.rhythmByStaffMeasure[key] = evs
      .map(
        (e) => `${e.tick}/${e.duration?.numerator ?? 0}/${e.duration?.denominator ?? 0}/${e.kind}`,
      )
      .join(",");
  }

  ir.derived = derived;
}

export function getCheckerList(): Checker[] {
  return getAll();
}

/**
 * `ruleOptions` は checker id → 未検証の生値。ここでは正規化せずそのまま渡す。
 * 正規化を checker 側（`resolveCheckerOptions`）に寄せておくと、テストが `checker.run(ir)` を
 * 直接呼ぶ経路と本番経路で挙動が一致する。
 */
export function runAllCheckers(
  ir: LintIR,
  enabledRules: Record<string, boolean> = {},
  ruleOptions: Record<string, Record<string, unknown>> = {},
): Issue[] {
  perf.clear();
  const tTotal = perf.now();

  const tDerived = perf.now();
  ensureDerived(ir);
  perf.addSince("ensureDerived", tDerived);

  const allIssues: Issue[] = [];
  const checkers = getAll();

  for (const checker of checkers) {
    const enabled =
      enabledRules[checker.id] !== undefined
        ? enabledRules[checker.id] !== false
        : checker.defaultEnabled !== false;
    if (!enabled) continue;

    try {
      const tChecker = perf.now();
      const issues = checker.run(ir, ruleOptions[checker.id]) ?? [];
      perf.addSince(checker.id, tChecker);
      log.info(`'${checker.id}': ${issues.length} 件検出`);
      allIssues.push(...issues);
    } catch (e) {
      log.error(`checker '${checker.id}' が失敗: ${e}`);
      allIssues.push({
        ruleId: "internal",
        severity: "error",
        category: "internal",
        message: `チェッカー '${checker.id}' の実行中にエラー: ${e}`,
        partName: "",
        staffIdx: -1,
        measure: 0,
        tick: 0,
        detail: null,
      });
    }
  }

  const tSort = perf.now();
  allIssues.sort(compareIssues);
  perf.addSince("sort", tSort);

  perf.addSince("total", tTotal);
  perf.count("issues", allIssues.length);
  return allIssues;
}
