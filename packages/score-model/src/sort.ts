/**
 * 比較が等しい要素を元の順に保つ並べ替え。
 *
 * `Array.prototype.sort` が安定と決まったのは ES2019 で、プラグインが動く QML の
 * エンジン（ES2017 相当）では保証されない。同じ tick の要素の並びが読み込み順から
 * 崩れると、指摘の並びがホストによって変わる。
 */
export function stableSortBy<T>(items: readonly T[], compare: (a: T, b: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => compare(a.item, b.item) || a.index - b.index)
    .map((entry) => entry.item);
}
