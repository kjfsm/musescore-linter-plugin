import type { Checker } from "./types.js";

const registered: Checker[] = [];
const byId: Record<string, Checker> = {};

export function register(checker: Checker): void {
	if (!checker?.id) return;
	if (byId[checker.id]) return;
	registered.push(checker);
	byId[checker.id] = checker;
}

export function getAll(): Checker[] {
	return registered.slice();
}

export function getById(id: string): Checker | null {
	return byId[id] ?? null;
}

export function reset(): void {
	registered.length = 0;
	for (const key of Object.keys(byId)) delete byId[key];
}
