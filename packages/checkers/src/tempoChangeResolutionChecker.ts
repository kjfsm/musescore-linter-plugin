import type { Checker, Issue, LintEvent, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

// 漸次的テンポ変化(rit. / rall. / accel. / allarg. 等)が解除されないまま放置されていないかを検査する。
// 解除は「a tempo / tempo primo / l'istesso tempo 等のテキスト」または「後続の新しいテンポ表記」とみなす。
const ON_RE =
	/(^|[^a-z])(rit\b|rit\.|ritard|rall\b|rall\.|rallent|accel|allarg|stringend|string\.|slentand|smorz|caland)/;
const OFF_RE =
	/(a tempo|tempo primo|tempo 1|tempo i\b|l'istesso|istesso tempo|in tempo|a battuta|tempo giusto)/;

export const tempoChangeResolutionChecker: Checker = {
	id: "tempo-change-resolution",
	name: "テンポ変化の解除漏れ",
	description:
		"rit./accel. 等の漸次的テンポ変化が a tempo や新しいテンポ表記で解除されないまま終わっていないかを検査",
	category: "tempo",
	severity: "warning",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const kinds = [
			canonical.elementKinds.TEMPO_TEXT,
			canonical.elementKinds.STAFF_TEXT,
			canonical.elementKinds.SYSTEM_TEXT,
			canonical.elementKinds.EXPRESSION,
		];

		// 全テキスト系イベントを tick 昇順で集約（テンポ変化はシステム全体に効くため横断的に見る）
		const seen = new Set<number>();
		const events: LintEvent[] = [];
		for (const kind of kinds) {
			for (const id of ir.index.byKind[kind] ?? []) {
				if (seen.has(id)) continue;
				seen.add(id);
				events.push(ir.events[id]);
			}
		}
		events.sort((a, b) => a.tick - b.tick);

		const partsByStaff: Record<number, string> = {};
		for (const p of ir.meta?.parts ?? []) partsByStaff[p.staffIdx] = p.partName;

		// 曲尾のリタルダンド等は a tempo 不要なので、最後の音楽小節は判定対象外にする
		let lastMusicMeasure = 0;
		for (const kind of [
			canonical.elementKinds.CHORD,
			canonical.elementKinds.REST,
		]) {
			for (const id of ir.index.byKind[kind] ?? []) {
				const m = ir.events[id].measure;
				if (m > lastMusicMeasure) lastMusicMeasure = m;
			}
		}

		const isNewTempoMark = (ev: LintEvent): boolean =>
			ev.kind === canonical.elementKinds.TEMPO_TEXT &&
			ev.tempo !== null &&
			ev.tempo !== undefined;

		for (let i = 0; i < events.length; i++) {
			const ev = events[i];
			if (!ON_RE.test(ev.textNorm)) continue;

			let resolved = false;
			for (let j = i + 1; j < events.length; j++) {
				const next = events[j];
				if (next.tick <= ev.tick) continue;
				if (OFF_RE.test(next.textNorm) || isNewTempoMark(next)) {
					resolved = true;
					break;
				}
			}
			if (resolved) continue;
			// 最後の音楽小節にある rit./accel. は「曲尾の最終的なテンポ変化」とみなし除外
			if (lastMusicMeasure > 0 && ev.measure >= lastMusicMeasure) continue;

			const partName =
				ev.staffIdx >= 0 ? (partsByStaff[ev.staffIdx] ?? "") : "";
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
