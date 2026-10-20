import { getAll, isCheckerEnabled } from "./checkerRegistry.js";
import { CANONICAL } from "./enumRegistry.js";
import { eventsOfKind } from "./irQuery.js";
import { compareIssues } from "./issue.js";
import { make } from "./logger.js";
import { createPerf } from "./perf.js";
import type {
  Checker,
  ChordEvent,
  IndexedIR,
  Issue,
  LintIR,
  RestEvent,
  SlurInfo,
  TieInfo,
} from "./types.js";

const log = make("linter");

// checker ごとの内訳を計測する。既定では無効（setPerfEnabled(true) で有効化）。
const perf = createPerf("checkers");

/** 直近の runAllCheckers の計測結果。計測が無効なら空文字列。 */
export function getCheckerPerfReport(): string {
  return perf.report();
}

function pushTo<K extends PropertyKey, V>(map: Record<K, V[]>, key: K, value: V): void {
  const list = map[key];
  if (list) list.push(value);
  else map[key] = [value];
}

export function withDerived(ir: LintIR): IndexedIR {
  const firstChordByStaff: Record<number, { tick: number; measure: number }> = {};
  const articulationsByChordId: Record<number, string[]> = {};
  const chordsByStaffMeasure: Record<string, ChordEvent[]> = {};
  const slursByStaff: Record<number, SlurInfo[]> = {};
  const tiesByStaff: Record<number, TieInfo[]> = {};
  const rhythmByStaffMeasure: Record<string, string> = {};

  const chords = eventsOfKind(ir, CANONICAL.elementKinds.CHORD);
  for (const ev of chords) {
    if (ev.articulations && ev.articulations.length > 0) {
      articulationsByChordId[ev.id] = ev.articulations;
    }
    if (ev.staffIdx < 0) continue;
    const existing = firstChordByStaff[ev.staffIdx];
    if (
      !existing ||
      ev.tick < existing.tick ||
      (ev.tick === existing.tick && ev.measure < existing.measure)
    ) {
      firstChordByStaff[ev.staffIdx] = { tick: ev.tick, measure: ev.measure };
    }
    pushTo(chordsByStaffMeasure, `${ev.staffIdx}:${ev.measure}:${ev.voice}`, ev);
  }
  for (const list of Object.values(chordsByStaffMeasure)) list.sort((a, b) => a.tick - b.tick);

  for (const slur of ir.meta.slurs) pushTo(slursByStaff, slur.staffIdx, slur);
  for (const list of Object.values(slursByStaff)) list.sort((a, b) => a.startTick - b.startTick);

  for (const tie of ir.meta.ties) pushTo(tiesByStaff, tie.staffIdx, tie);
  for (const list of Object.values(tiesByStaff)) list.sort((a, b) => a.startTick - b.startTick);

  const rhythmGroups: Record<string, (ChordEvent | RestEvent)[]> = {};
  for (const ev of [...chords, ...eventsOfKind(ir, CANONICAL.elementKinds.REST)]) {
    if (ev.staffIdx < 0) continue;
    pushTo(rhythmGroups, `${ev.staffIdx}:${ev.measure}:${ev.voice}`, ev);
  }
  for (const [key, evs] of Object.entries(rhythmGroups)) {
    rhythmByStaffMeasure[key] = evs
      .sort((a, b) => a.tick - b.tick)
      .map(
        (e) => `${e.tick}/${e.duration?.numerator ?? 0}/${e.duration?.denominator ?? 0}/${e.kind}`,
      )
      .join(",");
  }

  return {
    ...ir,
    derived: {
      firstChordByStaff,
      articulationsByChordId,
      slursByStaff,
      tiesByStaff,
      rhythmByStaffMeasure,
      chordsByStaffMeasure,
    },
  };
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
  const indexed = withDerived(ir);
  perf.addSince("withDerived", tDerived);

  const allIssues: Issue[] = [];
  const checkers = getAll();

  for (const checker of checkers) {
    if (!isCheckerEnabled(checker, enabledRules)) continue;

    try {
      const tChecker = perf.now();
      const issues = checker.run(indexed, ruleOptions[checker.id]);
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
