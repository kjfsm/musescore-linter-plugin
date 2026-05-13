import type { Checker, Issue, LintEvent, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";
import { getCanonical } from "./base/predicates.js";

function collectTextEvents(ir: LintIR): LintEvent[] {
	const canonical = getCanonical(ir);
	if (!canonical) return [];

	const kinds = [
		canonical.elementKinds.STAFF_TEXT,
		canonical.elementKinds.SYSTEM_TEXT,
		canonical.elementKinds.REHEARSAL_MARK,
	];

	const events: LintEvent[] = [];
	for (const kind of kinds) {
		const ids = ir.index.byKind[kind] ?? [];
		for (const id of ids) {
			events.push(ir.events[id]);
		}
	}
	return events;
}

const DS_RE = /\bd\.?\s*s\.?/;

export const codaSegnoChecker: Checker = {
	id: "coda-segno",
	name: "コーダ/セーニョ整合性",
	description:
		"D.S.・D.C. と Segno・Coda・Fine の対応関係を確認。参照先マークの欠落を検知",
	category: "notation",
	severity: "error",
	defaultEnabled: true,
	run(ir: LintIR): Issue[] {
		const issues: Issue[] = [];
		const textEvents = collectTextEvents(ir);
		if (textEvents.length === 0) return issues;

		const segnoRefs: LintEvent[] = [];
		const segnoMarks: LintEvent[] = [];
		const codaRefs: LintEvent[] = [];
		const codaMarks: LintEvent[] = [];

		for (const ev of textEvents) {
			const text = ev.textNorm;
			// D.S. 系（D.S., D.S. al Coda, D.S. al Fine, dal Segno）
			if (DS_RE.test(text) || text.includes("dal segno")) {
				segnoRefs.push(ev);
			}
			// Segno マーク
			if (text === "segno" || text.includes("𝅇") || text === "$") {
				segnoMarks.push(ev);
			}
			// al Coda 参照（D.S./D.C. al Coda）
			if (text.includes("al coda")) {
				codaRefs.push(ev);
			}
			// Coda マーク
			if (text === "coda" || text.includes("𝅌")) {
				codaMarks.push(ev);
			}
		}

		if (segnoRefs.length > 0 && segnoMarks.length === 0) {
			const ref = segnoRefs[0];
			issues.push(
				createIssue(codaSegnoChecker, {
					message: `"${ref.textRaw}" がありますが、対応する Segno マークが見つかりません`,
					partName: "",
					staffIdx: -1,
					measure: ref.measure,
					tick: ref.tick,
				}),
			);
		}

		if (codaRefs.length > 0 && codaMarks.length === 0) {
			const ref = codaRefs[0];
			issues.push(
				createIssue(codaSegnoChecker, {
					message: `"${ref.textRaw}" がありますが、対応する Coda マークが見つかりません`,
					partName: "",
					staffIdx: -1,
					measure: ref.measure,
					tick: ref.tick,
				}),
			);
		}

		if (codaMarks.length > 0 && codaRefs.length === 0) {
			const mark = codaMarks[0];
			issues.push(
				createIssue(codaSegnoChecker, {
					message: `Coda マークがありますが、"al Coda" を参照する記号（D.S./D.C. al Coda）が見つかりません`,
					partName: "",
					staffIdx: -1,
					measure: mark.measure,
					tick: mark.tick,
				}),
			);
		}

		return issues;
	},
};
