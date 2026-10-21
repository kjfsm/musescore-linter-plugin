import type { Score, Technique } from "@score-linter/score-model";
import { annotationsOn, normalizeText, stableSortBy } from "@score-linter/score-model";

import { defineRule } from "../engine.js";
import type { Rule, Severity } from "../types.js";
import { techniqueOf } from "./support.js";

interface TechniquePairConfig {
  id: string;
  name: string;
  description: string;
  on: readonly Technique[];
  off: readonly Technique[];
  onLabel: string;
  offLabel: string;
  /** on のままさらに on が来たときの severity。省略すると warning。 */
  onDuplicateSeverity?: Severity;
}

interface Switch {
  technique: Technique;
  text: string;
  tick: number;
  measure: number;
  staff: number;
}

/**
 * パートの奏法の切り替えを時間順に並べる。同じパートの複数の譜表に同じ指示が書かれて
 * いても 1 回と数える。
 */
function switchesOf(score: Score, staves: readonly number[]): Switch[] {
  const all: Switch[] = [];
  for (const staff of staves) {
    for (const a of annotationsOn(score, staff)) {
      const technique = techniqueOf(a);
      if (technique) {
        all.push({
          technique,
          text: normalizeText(a.text),
          tick: a.tick,
          measure: a.measure,
          staff,
        });
      }
    }
  }
  const sorted = stableSortBy(
    all,
    (a, b) =>
      a.measure - b.measure ||
      a.tick - b.tick ||
      (a.text < b.text ? -1 : a.text > b.text ? 1 : 0) ||
      a.staff - b.staff,
  );
  const seen = new Set<string>();
  return sorted.filter((s) => {
    const key = `${s.tick}|${s.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function techniquePair(config: TechniquePairConfig): Rule {
  return defineRule({
    id: config.id,
    meta: {
      name: config.name,
      description: config.description,
      category: "articulation",
      severity: "warning",
      tier: "recommended",
    },
    options: {},
    run({ score, report }) {
      for (const part of score.parts) {
        const staff = part.staves[0];
        if (staff === undefined) continue;
        let isOn = false;
        let hasBeenOn = false;
        let last: Switch | null = null;

        const reportDuplicate = (s: Switch, label: string, severity?: Severity) => {
          const previousMeasure = last?.measure ?? null;
          report({
            at: { staff, measure: s.measure, tick: s.tick },
            message:
              `${label} が既に指示済みの状態で再度指示されています` +
              (previousMeasure !== null ? "（前回: {{measure:previousMeasure}}）" : ""),
            detail: { previousMeasure },
            ...(severity ? { severity } : {}),
          });
        };

        for (const s of switchesOf(score, part.staves)) {
          if (config.on.includes(s.technique)) {
            if (isOn) reportDuplicate(s, config.onLabel, config.onDuplicateSeverity);
            isOn = true;
            hasBeenOn = true;
            last = s;
          } else if (config.off.includes(s.technique)) {
            if (!isOn && hasBeenOn) reportDuplicate(s, config.offLabel);
            isOn = false;
            last = s;
          }
        }

        if (isOn && last) {
          report({
            at: { staff, measure: last.measure, tick: last.tick },
            message: `${config.onLabel} のまま曲が終了しています（${config.offLabel} が必要かもしれません）`,
          });
        }
      }
    },
  });
}

export const pizzArco = techniquePair({
  id: "pizz-arco",
  name: "Pizz / Arco",
  description: "pizz.→arco の順序の乱れ・対応漏れを検出",
  on: ["pizz"],
  off: ["arco"],
  onLabel: "pizz.",
  offLabel: "arco",
});

export const sordino = techniquePair({
  id: "sordino",
  name: "Con sord. / Senza sord.",
  description: "con sord.→senza sord. の対応漏れ・重複を検出",
  on: ["con-sord"],
  off: ["senza-sord"],
  onLabel: "con sord.",
  offLabel: "senza sord.",
});

export const soloTutti = techniquePair({
  id: "solo-tutti",
  name: "Solo / Tutti",
  description: "solo/tutti の対応漏れ・重複を検出",
  on: ["solo"],
  off: ["tutti"],
  onLabel: "solo",
  offLabel: "tutti",
  // tutti を挟まない二連ソロは実際の記譜でも起こりうる
  onDuplicateSeverity: "info",
});

export const divUnis = techniquePair({
  id: "div-unis",
  name: "Div. / Unis.",
  description: "div.→unis. の対応漏れ・重複を検出",
  on: ["div"],
  off: ["unis"],
  onLabel: "div.",
  offLabel: "unis.",
});

export const sulTastoOrd = techniquePair({
  id: "sul-tasto-ord",
  name: "Sul tasto / Ord.",
  description: "sul tasto→ord. の対応漏れ・重複を検出",
  on: ["sul-tasto"],
  off: ["ord", "arco"],
  onLabel: "sul tasto",
  offLabel: "ord.",
});

export const sulPontOrd = techniquePair({
  id: "sul-pont-ord",
  name: "Sul pont. / Ord.",
  description: "sul pont.→ord. の対応漏れ・重複を検出",
  on: ["sul-pont"],
  off: ["ord", "arco"],
  onLabel: "sul pont.",
  offLabel: "ord.",
});

export const conLegnoArco = techniquePair({
  id: "con-legno-arco",
  name: "Con legno / Arco",
  description: "con legno→arco の対応漏れ・重複を検出",
  on: ["col-legno"],
  off: ["arco", "ord"],
  onLabel: "con legno",
  offLabel: "arco",
});

// 弦の con sord. / senza sord. は sordino が受け持つ。ここは金管のミュートと手で塞ぐ奏法。
export const muteOpen = techniquePair({
  id: "mute-open",
  name: "Mute / Open",
  description: "ミュート指定→open 復帰の対応漏れ・重複を検出",
  on: ["mute"],
  off: ["open", "ord", "natural"],
  onLabel: "mute",
  offLabel: "open",
});

export const unaCorda = techniquePair({
  id: "una-corda",
  name: "Una corda / Tre corde",
  description: "una corda→tre corde 復帰の対応漏れ・重複を検出",
  on: ["una-corda"],
  off: ["tre-corde"],
  onLabel: "una corda",
  offLabel: "tre corde",
});

export const harpTable = techniquePair({
  id: "harp-table",
  name: "Près de la table / Ord.",
  description: "près de la table→ordinario 復帰の対応漏れ・重複を検出",
  on: ["pres-de-la-table"],
  off: ["ord", "natural"],
  onLabel: "près de la table",
  offLabel: "ordinario",
});
