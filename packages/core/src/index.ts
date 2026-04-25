export { getAll, getById, register, reset } from "./checkerRegistry.js";
export type { EnumRegistry } from "./enumRegistry.js";
export { buildEnumRegistry, CANONICAL } from "./enumRegistry.js";
export type { IssueFields } from "./issue.js";
export { compareIssues, createIssue } from "./issue.js";
export { ensureDerived, getCheckerList, runAllCheckers } from "./linter.js";
export type { Logger } from "./logger.js";
export { make as makeLogger, setLevel } from "./logger.js";

export { buildSnapshot, normalizeText } from "./snapshot.js";
export type {
	CanonicalKinds,
	Checker,
	IRDerived,
	IRIndex,
	IRMeta,
	Issue,
	LintEvent,
	LintIR,
	MuseScoreEnums,
	Severity,
	TextPairCheckerConfig,
} from "./types.js";
