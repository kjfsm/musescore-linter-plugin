import { getAll } from "./checkerRegistry.js";
import { CANONICAL } from "./enumRegistry.js";
import { compareIssues } from "./issue.js";
import { make } from "./logger.js";
import type { Checker, IRDerived, Issue, LintIR } from "./types.js";

const log = make("linter");

export function ensureDerived(ir: LintIR): void {
	if (!ir?.events) return;
	if (ir.derived?._eventsCount === ir.events.length) return;

	const canonical = ir.registry?.canonical ?? CANONICAL;
	const derived: IRDerived = {
		_eventsCount: ir.events.length,
		firstChordByStaff: {},
		annotationIdsByTick: {},
		globalAnnotationIdsByTick: {},
	};

	const chordKind = canonical.elementKinds.CHORD;
	const chordIds = ir.index?.byKind?.[chordKind] ?? [];
	for (const id of chordIds) {
		const ev = ir.events[id];
		if (ev.staffIdx < 0) continue;
		const existing = derived.firstChordByStaff[ev.staffIdx];
		if (
			!existing ||
			ev.tick < existing.tick ||
			(ev.tick === existing.tick && ev.measure < existing.measure)
		) {
			derived.firstChordByStaff[ev.staffIdx] = {
				tick: ev.tick,
				measure: ev.measure,
			};
		}
	}

	const dynamicKind = canonical.elementKinds.DYNAMIC;
	for (const tick of Object.keys(ir.index?.byTick ?? {})) {
		const ids = ir.index.byTick[tick];
		const annotationIds = ids.filter((id) => {
			const e = ir.events[id];
			return e.type === "text" || e.kind === dynamicKind;
		});
		if (annotationIds.length > 0)
			derived.annotationIdsByTick[tick] = annotationIds;
	}

	const globalIds = ir.index?.byStaff?.["-1"] ?? [];
	for (const id of globalIds) {
		const gev = ir.events[id];
		const k = String(gev.tick);
		if (!derived.globalAnnotationIdsByTick[k])
			derived.globalAnnotationIdsByTick[k] = [];
		derived.globalAnnotationIdsByTick[k].push(gev.id);
	}

	ir.derived = derived;
}

export function getCheckerList(): Checker[] {
	return getAll();
}

export function runAllCheckers(
	ir: LintIR,
	enabledRules: Record<string, boolean> = {},
): Issue[] {
	ensureDerived(ir);
	const allIssues: Issue[] = [];
	const checkers = getAll();

	for (const checker of checkers) {
		const enabled =
			enabledRules[checker.id] !== undefined
				? enabledRules[checker.id] !== false
				: checker.defaultEnabled !== false;
		if (!enabled) continue;

		try {
			const issues = checker.run(ir) ?? [];
			log.info(`'${checker.id}': ${issues.length} 件検出`);
			allIssues.push(...issues);
		} catch (e) {
			log.error(`checker '${checker.id}' が失敗: ${e}`);
			allIssues.push({
				ruleId: "internal",
				severity: "error",
				category: "internal",
				message: `チェッカー '${checker.id}' の実行中にエラー: ${e}`,
				partName: "",
				staffIdx: -1,
				measure: 0,
				tick: 0,
				detail: null,
			});
		}
	}

	allIssues.sort(compareIssues);
	return allIssues;
}
