export type { CategoryInfo } from "./categories.js";
export { categoryLabel, getCategories } from "./categories.js";
export { getAll, getById, isCheckerEnabled, register, reset } from "./checkerRegistry.js";
export type { OptionParseResult } from "./checkerOptions.js";
export { findOptionSpec, parseCheckerOptionText, resolveCheckerOptions } from "./checkerOptions.js";
export { TICKS_PER_QUARTER, TICKS_PER_WHOLE } from "./constants.js";
export { CANONICAL } from "./enumRegistry.js";
export type {
  EventSpec,
  HairpinSpec,
  IRBuilder,
  IRBuilderInit,
  IRSpec,
  PartSpec,
  SlurSpec,
  TieSpec,
} from "./irBuilder.js";
export { buildIR, createIRBuilder } from "./irBuilder.js";
export type { IRProfile } from "./irProfile.js";
export { profileIR } from "./irProfile.js";
export type { IssueFields } from "./issue.js";
export { normalizePartGroups } from "./partGroups.js";
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
  CheckerOptionChoice,
  CheckerOptionSpec,
  CheckerOptionValue,
  HostVersionInfo,
  IRDerived,
  IRIndex,
  IRMeta,
  Issue,
  LintEvent,
  LintIR,
  MeasureInfo,
  NoteInfo,
  PartGroupInfo,
  PartGroupSymbol,
  Severity,
  TextPairCheckerConfig,
  TieInfo,
} from "./types.js";
export { compareVersions, isNewerVersion } from "./version.js";
