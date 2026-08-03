// 実行時間の計測ユーティリティ。既定は無効で、有効化しない限り計時も記録も行わない
// （プラグインの通常実行に影響を与えないため）。
//
// 時刻の取得に `Date.now()` を使うのは QML の QJSEngine に `performance.now()` が
// 無いため。測定対象は数百 ms オーダーなのでミリ秒精度で足りる。

let enabled = false;

export function setPerfEnabled(on: boolean): void {
  enabled = on;
}

export function isPerfEnabled(): boolean {
  return enabled;
}

export interface Perf {
  /** 現在時刻。無効時は 0 を返すので、呼び出し側で分岐する必要はない。 */
  now(): number;
  /** `t0`（`now()` の戻り値）からの経過を `label` に加算する。 */
  addSince(label: string, t0: number): void;
  /** ミリ秒を直接加算する。QML 側など、外部で計った値を持ち込むときに使う。 */
  add(label: string, ms: number): void;
  /** 回数を加算する（既定 1）。時間ではなく発生回数を数えたいとき。 */
  count(label: string, n?: number): void;
  /** 記録を捨てる。同じ Perf を再実行で使い回すときに呼ぶ。 */
  clear(): void;
  /** 人が読める複数行の文字列。無効時・記録なしのときは空文字列。 */
  report(): string;
}

function formatRows(rows: [string, number][], unit: string): string[] {
  if (rows.length === 0) return [];
  const labelWidth = Math.max(...rows.map(([label]) => label.length));
  const valueWidth = Math.max(...rows.map(([, value]) => String(value).length));
  return rows.map(
    ([label, value]) =>
      `  ${label.padEnd(labelWidth)}  ${String(value).padStart(valueWidth)} ${unit}`,
  );
}

export function createPerf(tag: string): Perf {
  // 挿入順を保ちたいので Object のキー順に依存する（キーはすべて文字列）。
  let times: Record<string, number> = {};
  let counts: Record<string, number> = {};

  return {
    now() {
      return enabled ? Date.now() : 0;
    },

    addSince(label, t0) {
      if (!enabled) return;
      times[label] = (times[label] ?? 0) + (Date.now() - t0);
    },

    add(label, ms) {
      if (!enabled) return;
      times[label] = (times[label] ?? 0) + ms;
    },

    count(label, n = 1) {
      if (!enabled) return;
      counts[label] = (counts[label] ?? 0) + n;
    },

    clear() {
      times = {};
      counts = {};
    },

    report() {
      if (!enabled) return "";
      const timeRows = Object.keys(times).map((k) => [k, times[k]] as [string, number]);
      const countRows = Object.keys(counts).map((k) => [k, counts[k]] as [string, number]);
      if (timeRows.length === 0 && countRows.length === 0) return "";

      const lines = [`[ScoreLinter:${tag}]`];
      lines.push(...formatRows(timeRows, "ms"));
      if (timeRows.length > 0 && countRows.length > 0) lines.push("  ---");
      lines.push(...formatRows(countRows, "回"));
      return lines.join("\n");
    },
  };
}
