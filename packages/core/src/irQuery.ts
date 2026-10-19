import type { LintEvent, LintIR } from "./types.js";

function eventsByIds(ir: LintIR, ids: readonly number[]): LintEvent[] {
  return ids.map((id) => {
    const ev = ir.events[id];
    if (!ev) throw new Error(`LintIR の索引が存在しないイベント id ${id} を指しています`);
    return ev;
  });
}

/** kind のイベントを、索引に積まれた順（＝ IR に足された順）で返す。 */
export function eventsOfKind(ir: LintIR, kind: string): LintEvent[] {
  return eventsByIds(ir, ir.index.byKind[kind] ?? []);
}

/** global scope（staffIdx -1）は含めない。含めるなら checkers の `eventIdsForStaff`。 */
export function eventsOnStaff(ir: LintIR, staffIdx: number, kind: string): LintEvent[] {
  return eventsByIds(ir, ir.index.byStaffAndKind[staffIdx]?.[kind] ?? []);
}

export function eventsAtTick(ir: LintIR, tick: number): LintEvent[] {
  return eventsByIds(ir, ir.index.byTick[String(tick)] ?? []);
}
