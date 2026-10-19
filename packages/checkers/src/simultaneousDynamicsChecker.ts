import type { Checker, IndexedIR, Issue, TextEvent } from "@musescore-linter/core";
import { CANONICAL, createIssue, eventsOnStaff } from "@musescore-linter/core";

// 同一パート・同一 tick に異なるダイナミクスが同時に置かれている矛盾を検出する。
// 例: 同じ音に f と p が両方付いている（コピペミス・置き換え漏れ）。
function dynamicIdentity(ev: TextEvent): string {
  if (ev.subtype !== null && ev.subtype !== undefined) {
    return `subtype:${String(ev.subtype)}`;
  }
  return `text:${ev.textNorm}`;
}

export const simultaneousDynamicsChecker: Checker = {
  id: "simultaneous-dynamics",
  name: "同時ダイナミクスの衝突",
  description: "同じ位置で強弱記号が矛盾する箇所を検出",
  category: "dynamics",
  severity: "warning",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];

    const parts = ir.meta.parts;
    for (const part of parts) {
      const byTick: Record<number, TextEvent[]> = {};
      for (const ev of eventsOnStaff(ir, part.staffIdx, CANONICAL.elementKinds.DYNAMIC)) {
        const group = byTick[ev.tick] ?? [];
        group.push(ev);
        byTick[ev.tick] = group;
      }

      for (const group of Object.values(byTick)) {
        const [first] = group;
        if (!first || group.length < 2) continue;
        const identities = new Set(group.map(dynamicIdentity));
        if (identities.size < 2) continue;

        const labels = group.map((e) => e.textRaw || e.textNorm || "(?)").join(" / ");
        issues.push(
          createIssue(simultaneousDynamicsChecker, {
            message: `${part.partName}: 同じ位置に異なるダイナミクスが同時に付いています（${first.measure}小節目: ${labels}）`,
            partName: part.partName,
            staffIdx: part.staffIdx,
            measure: first.measure,
            tick: first.tick,
            detail: { dynamics: group.map((e) => e.textRaw || e.textNorm) },
          }),
        );
      }
    }
    return issues;
  },
};
