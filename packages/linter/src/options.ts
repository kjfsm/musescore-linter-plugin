import type { OptionSpec, OptionSpecs, OptionValue, OptionValues } from "./types.ts";

/** multiselect の値を、宣言の choices の順・重複なしにそろえる。保存のたびに差分が揺れないように。 */
function normalizeMultiselect(
  spec: OptionSpec & { type: "multiselect" },
  raw: unknown,
): string[] | null {
  if (!Array.isArray(raw)) return null;
  const picked = new Set(raw.filter((v): v is string => typeof v === "string"));
  return spec.choices.map((c) => c.value).filter((v) => picked.has(v));
}

export function defaultOptionValue(spec: OptionSpec): OptionValue {
  return spec.type === "multiselect" ? [...spec.default] : spec.default;
}

/**
 * 保存値や CLI から来た値を、ルールが使える値に直す。投げない。
 *
 * 未知のキーは捨て、型や choices に合わない値はそのキーだけ既定値に戻す。ルールの追加や改名で
 * 古い保存値が混ざるのは普通のことで、オブジェクトごと捨てると他の設定まで巻き添えになる。
 */
export function resolveOptions<S extends OptionSpecs>(specs: S, raw: unknown): OptionValues<S> {
  const out: Record<string, OptionValue> = {};
  const given =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  for (const key of Object.keys(specs)) {
    const spec = specs[key]!;
    out[key] = defaultOptionValue(spec);
    const value = given[key];
    if (value === undefined) continue;

    if (spec.type === "boolean") {
      if (typeof value === "boolean") out[key] = value;
    } else if (spec.type === "select") {
      if (typeof value === "string" && spec.choices.some((c) => c.value === value))
        out[key] = value;
    } else {
      // 空配列は「どれも選ばない」という有効な指定
      const normalized = normalizeMultiselect(spec, value);
      if (normalized !== null) out[key] = normalized;
    }
  }
  return out as OptionValues<S>;
}

export type OptionParseResult = { ok: true; value: OptionValue } | { ok: false; error: string };

const BOOLEAN_TRUE = ["true", "1", "yes", "on"];
const BOOLEAN_FALSE = ["false", "0", "no", "off"];

/**
 * 人が打った文字列（CLI の `--rule-option=<id>.<key>=<value>` など）を値に変換する。
 * {@link resolveOptions} と違い、打ち間違いを黙って既定値に落とさず失敗を返す。
 */
export function parseOptionText(key: string, spec: OptionSpec, text: string): OptionParseResult {
  const t = text.trim();
  if (spec.type === "boolean") {
    const lower = t.toLowerCase();
    if (BOOLEAN_TRUE.includes(lower)) return { ok: true, value: true };
    if (BOOLEAN_FALSE.includes(lower)) return { ok: true, value: false };
    return { ok: false, error: `'${key}' は true / false で指定してください（指定値: ${text}）` };
  }

  const known = spec.choices.map((c) => c.value);
  if (spec.type === "select") {
    if (known.includes(t)) return { ok: true, value: t };
    return {
      ok: false,
      error: `'${key}' に指定できるのは ${known.join(" / ")} です（指定値: ${text}）`,
    };
  }

  if (t === "") return { ok: true, value: [] };
  const items = t.split(",").map((s) => s.trim());
  const unknown = items.filter((s) => !known.includes(s));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `'${key}' に指定できるのは ${known.join(" / ")} です（不明な値: ${unknown.join(", ")}）`,
    };
  }
  const picked = new Set(items);
  return { ok: true, value: known.filter((v) => picked.has(v)) };
}
