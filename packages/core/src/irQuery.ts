import type { ElementKind } from "./enumRegistry.js";
import type { EventOfKind, LintEvent, LintIR } from "./types.js";

function eventsByIds<E extends LintEvent>(ir: LintIR, ids: readonly number[]): E[] {
  return ids.map((id) => {
    const ev = ir.events[id];
    if (!ev) throw new Error(`LintIR の索引が存在しないイベント id ${id} を指しています`);
    // 索引は kind ごとに張られるので、byKind[k] の id は kind が k のイベントしか指さない。
    return ev as E;
  });
}

/** kind のイベントを、索引に積まれた順（＝ IR に足された順）で返す。 */
export function eventsOfKind<K extends ElementKind>(ir: LintIR, kind: K): EventOfKind<K>[] {
  return eventsByIds(ir, ir.index.byKind[kind] ?? []);
}

/** global scope（staffIdx -1）は含めない。含めるなら checkers の `eventsForStaff`。 */
export function eventsOnStaff<K extends ElementKind>(
  ir: LintIR,
  staffIdx: number,
  kind: K,
): EventOfKind<K>[] {
  return eventsByIds(ir, ir.index.byStaffAndKind[staffIdx]?.[kind] ?? []);
}

export function eventsAtTick(ir: LintIR, tick: number): LintEvent[] {
  return eventsByIds(ir, ir.index.byTick[String(tick)] ?? []);
}
