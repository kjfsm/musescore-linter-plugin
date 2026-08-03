/**
 * tick の分解能。MuseScore の内部 tick に合わせてあり、MusicXML 経路も
 * `divisions` からこの尺度へ正規化する（両ソースの tick を直接比較できるようにするため）。
 */
export const TICKS_PER_QUARTER = 480;

/** 全音符の tick 長。`LintEvent.duration`（全音符 = 1 の分数）から tick へ直すときの係数。 */
export const TICKS_PER_WHOLE = TICKS_PER_QUARTER * 4;
