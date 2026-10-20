import type { Checker, IndexedIR, Issue, TextEvent } from "@score-linter/core";
import { CANONICAL, createIssue, eventsOfKind } from "@score-linter/core";

import { PROSE_TEXT_KINDS } from "./base/predicates.js";
import { buildPartNameMap } from "./base/query.js";

// 漸次的テンポ変化(rit. / rall. / accel. / allarg. 等)が解除されないまま放置されていないかを検査する。
// 解除は「a tempo / tempo primo / l'istesso tempo 等のテキスト」または「後続の新しいテンポ表記」とみなす。
const ON_RE =
  /(^|[^a-z])(rit\b|rit\.|ritard|rall\b|rall\.|rallent|accel|allarg|stringend|string\.|slentand|smorz|caland)/;
const OFF_RE =
  /(a tempo|tempo primo|tempo 1|tempo i\b|l'istesso|istesso tempo|in tempo|a battuta|tempo giusto)/;

export const tempoChangeResolutionChecker: Checker = {
  id: "tempo-change-resolution",
  name: "テンポ変化の解除漏れ",
  description: "rit./accel.等が解除されないまま終わる箇所を検出",
  category: "tempo",
  severity: "warning",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];

    const kinds = PROSE_TEXT_KINDS;

    // 全テキスト系イベントを tick 昇順で集約（テンポ変化はシステム全体に効くため横断的に見る）
    const seen = new Set<number>();
    const events: TextEvent[] = [];
    for (const kind of kinds) {
      for (const ev of eventsOfKind(ir, kind)) {
        if (seen.has(ev.id)) continue;
        seen.add(ev.id);
        events.push(ev);
      }
    }
    events.sort((a, b) => a.tick - b.tick);

    const partsByStaff = buildPartNameMap(ir);

    // 曲尾のリタルダンド等は a tempo 不要なので、最後の音楽小節は判定対象外にする
    let lastMusicMeasure = 0;
    for (const kind of [CANONICAL.elementKinds.CHORD, CANONICAL.elementKinds.REST]) {
      for (const { measure } of eventsOfKind(ir, kind)) {
        if (measure > lastMusicMeasure) lastMusicMeasure = measure;
      }
    }

    const isNewTempoMark = (ev: TextEvent): boolean =>
      ev.kind === CANONICAL.elementKinds.TEMPO_TEXT && ev.tempo !== null && ev.tempo !== undefined;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i]!;
      if (!ON_RE.test(ev.textNorm)) continue;

      let resolved = false;
      for (let j = i + 1; j < events.length; j++) {
        const next = events[j]!;
        if (next.tick <= ev.tick) continue;
        if (OFF_RE.test(next.textNorm) || isNewTempoMark(next)) {
          resolved = true;
          break;
        }
      }
      if (resolved) continue;
      // 最後の音楽小節にある rit./accel. は「曲尾の最終的なテンポ変化」とみなし除外
      if (lastMusicMeasure > 0 && ev.measure >= lastMusicMeasure) continue;

      const partName = ev.staffIdx >= 0 ? (partsByStaff.get(ev.staffIdx) ?? "") : "";
      const label = (ev.textRaw || ev.textNorm).trim();
      issues.push(
        createIssue(tempoChangeResolutionChecker, {
          message: `テンポ変化「${label}」が a tempo 等で解除されていません（${ev.measure}小節目）`,
          partName,
          staffIdx: ev.staffIdx,
          measure: ev.measure,
          tick: ev.tick,
          detail: { label },
        }),
      );
    }
    return issues;
  },
};
