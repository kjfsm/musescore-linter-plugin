import { getAll } from "./checkerRegistry.js";

/**
 * checker のカテゴリの表示名と並び順。
 *
 * 以前は apps/web の rules.ts と qml/SettingsPanel.qml が別々に持っており、
 * 実際に乖離していた（並び順が articulation 先頭 / tempo 先頭、ラベルが
 * 「強弱」/「ダイナミクス」）。さらに QML 側は並び順の配列を駆動して設定タブを
 * 組み立てていたため、**配列に載っていないカテゴリの checker は設定タブに
 * まったく出てこなかった**。slur-tie カテゴリが追加されたとき、この経路で
 * 4 つの checker が MuseScore 上から ON/OFF できなくなっていた。
 *
 * 表示に関わる知識ではあるが、checker のカテゴリを決めているのは checker 自身
 * （`Checker.category`）なので、その語彙の説明も同じ側に置くのが筋。
 */
const CATEGORY_LABELS: Record<string, string> = {
  tempo: "テンポ",
  dynamics: "強弱",
  articulation: "奏法・アーティキュレーション",
  "slur-tie": "スラー・タイ",
  notation: "記譜",
};

/** 設定パネルでの並び順。ここに無いカテゴリは後ろへ回す（落とさない）。 */
const CATEGORY_ORDER = ["tempo", "dynamics", "articulation", "slur-tie", "notation"];

export interface CategoryInfo {
  id: string;
  label: string;
}

/** カテゴリ id の表示名。未知のカテゴリは id をそのまま返す。 */
export function categoryLabel(id: string): string {
  return CATEGORY_LABELS[id] ?? id;
}

/**
 * 登録済みの checker に実際に現れるカテゴリを表示順で返す。
 *
 * 既知の並び順を使いつつ、**未知のカテゴリも必ず末尾に含める**。
 * 一覧を固定にすると、カテゴリを増やしたときに UI から checker が消える。
 */
export function getCategories(): CategoryInfo[] {
  const present = new Set<string>();
  for (const checker of getAll()) present.add(checker.category);

  const rank = (id: string): number => {
    const i = CATEGORY_ORDER.indexOf(id);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };

  return [...present]
    .sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0))
    .map((id) => ({ id, label: categoryLabel(id) }));
}
