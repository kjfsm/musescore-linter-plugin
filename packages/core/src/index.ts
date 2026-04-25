export type {
  Severity,
  LintEvent,
  IRIndex,
  IRMeta,
  IRDerived,
  CanonicalKinds,
  LintIR,
  Issue,
  Checker,
  TextPairCheckerConfig,
  MuseScoreEnums,
} from "./types.js";

export { CANONICAL, buildEnumRegistry } from "./enumRegistry.js";
export type { EnumRegistry } from "./enumRegistry.js";

export { createIssue, compareIssues } from "./issue.js";
export type { IssueFields } from "./issue.js";

export { register, getAll, getById, reset } from "./checkerRegistry.js";

export { make as makeLogger, setLevel } from "./logger.js";
export type { Logger } from "./logger.js";

export { buildSnapshot, normalizeText } from "./snapshot.js";

export { ensureDerived, getCheckerList, runAllCheckers } from "./linter.js";
