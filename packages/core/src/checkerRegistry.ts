import type { Checker } from "./types.js";

const registered: Checker[] = [];
const byId: Record<string, Checker> = {};

/**
 * checker を登録する。id が重複したら throw する。
 *
 * 以前は黙って捨てていたが、それだと id を打ち間違えた（既存の id と衝突させた）
 * checker が「登録したのに動かない」状態になり、気づく手段が無かった。
 * registerAll は起動時に 1 回しか走らないので、ここで落ちれば必ず開発中に見つかる。
 */
export function register(checker: Checker): void {
  if (!checker?.id) return;
  if (byId[checker.id]) {
    throw new Error(`checker id '${checker.id}' が重複しています`);
  }
  registered.push(checker);
  byId[checker.id] = checker;
}

export function getAll(): Checker[] {
  return registered.slice();
}

export function getById(id: string): Checker | null {
  return byId[id] ?? null;
}

export function reset(): void {
  registered.length = 0;
  for (const key of Object.keys(byId)) delete byId[key];
}
