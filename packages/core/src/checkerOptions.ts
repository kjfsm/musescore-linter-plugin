import type { Checker, CheckerOptionSpec, CheckerOptionValue } from "./types.js";

/** 宣言から key で spec を引く。未宣言・未知 key は null。 */
export function findOptionSpec(checker: Checker, key: string): CheckerOptionSpec | null {
  return checker.options?.find((s) => s.key === key) ?? null;
}

/**
 * multiselect の値を「spec の choices 順・重複なし」に正規化する。
 * 順序を正規化しないと、同じ選択でも保存のたびに差分判定が揺れてしまう。
 */
function normalizeMultiselect(
  spec: CheckerOptionSpec & { type: "multiselect" },
  raw: unknown,
): string[] | null {
  if (!Array.isArray(raw)) return null;
  const picked = new Set(raw.filter((v): v is string => typeof v === "string"));
  return spec.choices.map((c) => c.value).filter((v) => picked.has(v));
}

/**
 * 永続値・CLI 由来の生値を、checker が実際に使える値へ落とし込む。
 *
 * **決して throw しない全域関数**。checker の追加・改名で古い永続値が混ざるのは常態なので、
 * 未知キーは黙って捨て、型不一致や choices 外の値はそのキーだけ既定値に落とす
 * （オブジェクト全体を捨てるとユーザーの他の設定まで巻き添えになる）。
 */
export function resolveCheckerOptions(
  specs: CheckerOptionSpec[] | undefined,
  raw: unknown,
): Record<string, CheckerOptionValue> {
  const out: Record<string, CheckerOptionValue> = {};
  if (!specs) return out;

  for (const spec of specs) {
    out[spec.key] = spec.type === "multiselect" ? [...spec.default] : spec.default;
  }

  // 配列・null・プリミティブは「設定なし」として既定のまま返す
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;

  for (const spec of specs) {
    const value = (raw as Record<string, unknown>)[spec.key];
    if (value === undefined) continue;

    if (spec.type === "boolean") {
      if (typeof value === "boolean") out[spec.key] = value;
      continue;
    }
    if (spec.type === "select") {
      if (typeof value === "string" && spec.choices.some((c) => c.value === value)) {
        out[spec.key] = value;
      }
      continue;
    }
    // multiselect は不正要素だけ除去する。空配列は「どれも選ばない」という有効な指定。
    const normalized = normalizeMultiselect(spec, value);
    if (normalized !== null) out[spec.key] = normalized;
  }

  return out;
}

export type OptionParseResult =
  | { ok: true; value: CheckerOptionValue }
  | { ok: false; error: string };

const BOOLEAN_TRUE = ["true", "1", "yes", "on"];
const BOOLEAN_FALSE = ["false", "0", "no", "off"];

/**
 * CLI の `--rule-option=<id>.<key>=<value>` のような**文字列**を値へ変換する。
 *
 * `resolveCheckerOptions` と違い、ここは人間が打った指定を受ける境界なので
 * 黙って既定に落とさず Result で失敗を返す（`.claude/rules/error-handling.md`）。
 */
export function parseCheckerOptionText(spec: CheckerOptionSpec, text: string): OptionParseResult {
  if (spec.type === "boolean") {
    const t = text.trim().toLowerCase();
    if (BOOLEAN_TRUE.includes(t)) return { ok: true, value: true };
    if (BOOLEAN_FALSE.includes(t)) return { ok: true, value: false };
    return {
      ok: false,
      error: `'${spec.key}' は true / false で指定してください（指定値: ${text}）`,
    };
  }

  const known = spec.choices.map((c) => c.value);
  if (spec.type === "select") {
    const t = text.trim();
    if (known.includes(t)) return { ok: true, value: t };
    return {
      ok: false,
      error: `'${spec.key}' に指定できるのは ${known.join(" / ")} です（指定値: ${text}）`,
    };
  }

  const t = text.trim();
  if (t === "") return { ok: true, value: [] };
  const items = t.split(",").map((s) => s.trim());
  const unknown = items.filter((s) => !known.includes(s));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `'${spec.key}' に指定できるのは ${known.join(" / ")} です（不明な値: ${unknown.join(", ")}）`,
    };
  }
  const picked = new Set(items);
  return { ok: true, value: known.filter((v) => picked.has(v)) };
}
