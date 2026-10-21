import type { Annotation } from "@score-linter/score-model";

import { directiveOf } from "./common.ts";

export const bpmOf = (a: Annotation): number | null => directiveOf(a, "tempo")?.bpm ?? null;

// テンポはシステム全体に効くので、最上段の譜表だけを見て重複して報告しない
export const TOP_STAFF = 0;
