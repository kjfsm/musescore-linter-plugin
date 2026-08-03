export { getAll, getById, register, reset } from "./checkerRegistry.js";
export { CANONICAL } from "./enumRegistry.js";
export type { EventSpec, HairpinSpec, IRSpec, PartSpec, SlurSpec, TieSpec } from "./irBuilder.js";
export { buildIR } from "./irBuilder.js";
export type { IssueFields } from "./issue.js";
export { compareIssues, createIssue } from "./issue.js";
export { ensureDerived, getCheckerList, getCheckerPerfReport, runAllCheckers } from "./linter.js";
export type { Logger } from "./logger.js";
export { make as makeLogger, setLevel } from "./logger.js";
export type { Perf } from "./perf.js";
export { createPerf, isPerfEnabled, setPerfEnabled } from "./perf.js";
export { tpcToAlter, tpcToName, tpcToStep } from "./pitchSpelling.js";

export type {
  CanonicalKinds,
  Checker,
  HostVersionInfo,
  IRDerived,
  IRIndex,
  IRMeta,
  Issue,
  LintEvent,
  LintIR,
  NoteInfo,
  Severity,
  TextPairCheckerConfig,
  TieInfo,
} from "./types.js";
export { compareVersions, isNewerVersion } from "./version.js";
