import type { CanonicalKinds, LintEvent, LintIR } from "@musescore-linter/core";

export function getCanonical(ir: LintIR): CanonicalKinds | null {
	return ir?.registry?.canonical ?? null;
}

export function isKind(ev: LintEvent, kind: string): boolean {
	return !!ev && ev.kind === kind;
}

export function normalizeToken(rawText: string): string {
	return (rawText ?? "")
		.toLowerCase()
		.replace(/<[^>]*>/g, "")
		.replace(/\s+/g, "")
		.replace(/\./g, "")
		.trim();
}

export function isTempoMark(ev: LintEvent, ir: LintIR): boolean {
	const canonical = getCanonical(ir);
	return !!(canonical && isKind(ev, canonical.elementKinds.TEMPO_TEXT));
}

export function isDynamicMark(ev: LintEvent, ir: LintIR): boolean {
	const canonical = getCanonical(ir);
	if (canonical && isKind(ev, canonical.elementKinds.DYNAMIC)) return true;
	const subStyle = (ev?.subStyle ? String(ev.subStyle) : "").toLowerCase();
	return subStyle.includes("dynamic");
}

export function matchesAny(text: string, patterns: string[]): boolean {
	return patterns.includes(text);
}

export interface PartBucketEvent {
	text: string;
	rawText: string;
	tick: number;
	measure: number;
	staffIdx: number;
}

export interface PartBucket {
	partName: string;
	staffIdx: number;
	events: PartBucketEvent[];
}

export function buildPartBuckets(ir: LintIR): PartBucket[] {
	const canonical = getCanonical(ir);
	if (!canonical) return [];

	const textualKinds = [
		canonical.elementKinds.TEMPO_TEXT,
		canonical.elementKinds.STAFF_TEXT,
		canonical.elementKinds.SYSTEM_TEXT,
		canonical.elementKinds.EXPRESSION,
		canonical.elementKinds.REHEARSAL_MARK,
		canonical.elementKinds.DYNAMIC,
	];

	const buckets: Record<string, PartBucket> = {};
	const metaParts = ir.meta?.parts ?? [];

	for (const part of metaParts) {
		const { staffIdx } = part;
		const key = part.partName || `Staff ${staffIdx + 1}`;
		const byStaff = ir.index?.byStaffAndKind?.[staffIdx] ?? {};

		if (!buckets[key]) {
			buckets[key] = { partName: key, staffIdx, events: [] };
		} else if (staffIdx < buckets[key].staffIdx) {
			buckets[key].staffIdx = staffIdx;
		}

		for (const kind of textualKinds) {
			const ids = byStaff[kind] ?? [];
			for (const id of ids) {
				const ev = ir.events[id];
				buckets[key].events.push({
					text: ev.textNorm,
					rawText: ev.textRaw,
					tick: ev.tick,
					measure: ev.measure,
					staffIdx: ev.staffIdx,
				});
			}
		}
	}

	return Object.values(buckets)
		.map((bucket) => {
			bucket.events.sort((a, b) => {
				if (a.measure !== b.measure) return a.measure - b.measure;
				if (a.tick !== b.tick) return a.tick - b.tick;
				if (a.text !== b.text) return a.text < b.text ? -1 : 1;
				return a.staffIdx - b.staffIdx;
			});

			const seen = new Set<string>();
			bucket.events = bucket.events.filter((ev) => {
				const key = `${ev.tick}|${ev.text}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});

			return bucket;
		})
		.sort((a, b) => a.staffIdx - b.staffIdx);
}
