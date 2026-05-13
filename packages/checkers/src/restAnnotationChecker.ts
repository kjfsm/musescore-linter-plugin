import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical, isDynamicMark, isKind } from "./base/predicates.js";

// 休符に付与してはいけない演奏技法テキスト（textNorm の完全一致）
const DISALLOWED_TECHNIQUE_PATTERNS = new Set([
	"pizz.",
	"pizz",
	"pizzicato",
	"arco",
	"con sord.",
	"con sord",
	"con sordino",
	"senza sord.",
	"senza sord",
	"senza sordino",
	"sul tasto",
	"sul pont.",
	"sul ponticello",
	"s.p.",
	"sp.",
	"con legno",
	"col legno",
	"solo",
	"tutti",
	"div.",
	"divisi",
	"unis.",
	"unison",
	"unisono",
	"ord.",
	"ord",
	"ordinario",
]);

export const restAnnotationChecker: Checker = {
	id: "rest-annotation",
	name: "休符アノテーション",
	description:
		"休符位置の注記を確認（強弱記号・演奏技法テキストは不受理、リハーサル記号等は受理）",
	category: "notation",
	severity: "error",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const canonical = getCanonical(ir);
		if (!canonical) return issues;

		const parts = ir.meta?.parts ?? [];
		const annotationKinds = [
			canonical.elementKinds.STAFF_TEXT,
			canonical.elementKinds.EXPRESSION,
			canonical.elementKinds.DYNAMIC,
		];

		for (const staff of parts) {
			const byStaff = ir.index.byStaffAndKind[staff.staffIdx] ?? {};
			const restTicks = new Set<number>(
				(byStaff[canonical.elementKinds.REST] ?? []).map(
					(id) => ir.events[id].tick,
				),
			);

			for (const kind of annotationKinds) {
				const ids = byStaff[kind] ?? [];
				for (const id of ids) {
					const ev = ir.events[id];
					if (!restTicks.has(ev.tick)) continue;

					const isDisallowed =
						isDynamicMark(ev, ir) ||
						((isKind(ev, canonical.elementKinds.STAFF_TEXT) ||
							isKind(ev, canonical.elementKinds.EXPRESSION)) &&
							DISALLOWED_TECHNIQUE_PATTERNS.has(ev.textNorm));

					if (!isDisallowed) continue;

					issues.push(
						createIssue(restAnnotationChecker, {
							message: `${staff.partName}: 休符に不受理の注記 "${ev.textRaw}" が付与されています（${ev.measure}小節目）`,
							partName: staff.partName,
							staffIdx: staff.staffIdx,
							measure: ev.measure,
							tick: ev.tick,
						}),
					);
				}
			}
		}
		return issues;
	},
};
