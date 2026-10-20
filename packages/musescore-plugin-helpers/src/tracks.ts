/** MuseScore uses 4 voices per staff for track encoding. */
export const VOICES_PER_STAFF = 4;

export function trackToStaffIdx(track: number): number {
  return Math.floor(track / VOICES_PER_STAFF);
}

export function staffVoiceToTrack(staffIdx: number, voice: number): number {
  return staffIdx * VOICES_PER_STAFF + voice;
}
