import type { Annotation, Score } from "@score-linter/score-model";
import { annotationsAffecting, annotationsOn } from "@score-linter/score-model";

import { directiveOf, ofKind } from "./common.ts";

export const dynamicsOn = (score: Score, staff: number) =>
  ofKind(annotationsOn(score, staff), "dynamic");
export const dynamicsAffecting = (score: Score, staff: number) =>
  ofKind(annotationsAffecting(score, staff), "dynamic");
export const isDynamicChange = (a: Annotation) => directiveOf(a, "dynamic-change") !== undefined;
