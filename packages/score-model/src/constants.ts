/**
 * tick の分解能。MuseScore の内部 tick に合わせてあり、MusicXML の reader も
 * `divisions` からこの尺度へ直す（どちらから読んだ Score でも tick を直接比べられるように）。
 */
export const TICKS_PER_QUARTER = 480;

export const TICKS_PER_WHOLE = TICKS_PER_QUARTER * 4;
