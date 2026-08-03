import type { LintIR } from "@musescore-linter/core";

/**
 * staffIdx → 比較グループキーを引くクロージャを返す。
 *
 * 選択された種類の括弧のうち、その譜表を覆う**最小のもの**を採用する（入れ子なら内側が勝つ）。
 * どの括弧にも属さない譜表には `null` を返し、比較対象から外す。
 *
 * 選択された種類の括弧が 1 本も無ければ**関数ごと `null`** を返す。呼び出し側はこれを見て
 * 全パート横断へフォールバックする。
 *
 * `ir.meta.partGroups` の走査と Map 構築は 1 回だけ行う。小節ごとに呼ぶと
 * 「小節数 × 括弧数 × パート数」になるので、`run` の先頭で 1 度だけ作って使い回すこと。
 */
export function bracketGroupKeyOf(
  ir: LintIR,
  symbols: readonly string[],
): ((staffIdx: number) => string | null) | null {
  const wanted = new Set(symbols);
  const groups = (ir.meta?.partGroups ?? []).filter(
    // 1 譜表しか覆わない括弧は「最小の括弧」として外側を覆い隠してしまうだけで、
    // 比較相手を生まない。候補から外さないとその譜表が永久に無検出になる。
    (g) => wanted.has(g.symbol) && g.staffCount >= 2,
  );
  if (groups.length === 0) return null;

  // 小さい括弧から順に割り当て、先に入ったもの（＝より内側）を優先する。
  const sorted = [...groups].sort(
    (a, b) => a.staffCount - b.staffCount || b.startStaffIdx - a.startStaffIdx,
  );

  const keyByStaff = new Map<number, string>();
  for (const g of sorted) {
    const key = `${g.startStaffIdx}:${g.staffCount}`;
    for (let i = g.startStaffIdx; i < g.startStaffIdx + g.staffCount; i++) {
      if (!keyByStaff.has(i)) keyByStaff.set(i, key);
    }
  }

  return (staffIdx: number) => keyByStaff.get(staffIdx) ?? null;
}
