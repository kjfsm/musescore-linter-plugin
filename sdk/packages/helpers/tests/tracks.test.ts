import { describe, expect, it } from "vitest";
import { staffVoiceToTrack, trackToStaffIdx } from "../src/tracks.js";

describe("trackToStaffIdx", () => {
  it("converts track 0 to staffIdx 0, voice 0", () => {
    expect(trackToStaffIdx(0)).toBe(0);
  });

  it("converts tracks within the first staff", () => {
    expect(trackToStaffIdx(1)).toBe(0);
    expect(trackToStaffIdx(2)).toBe(0);
    expect(trackToStaffIdx(3)).toBe(0);
  });

  it("converts track 4 to staffIdx 1", () => {
    expect(trackToStaffIdx(4)).toBe(1);
  });

  it("converts track 9 to staffIdx 2", () => {
    expect(trackToStaffIdx(9)).toBe(2);
  });
});

describe("staffVoiceToTrack", () => {
  it("converts staffIdx 0, voice 0 to track 0", () => {
    expect(staffVoiceToTrack(0, 0)).toBe(0);
  });

  it("converts staffIdx 0, voice 3 to track 3", () => {
    expect(staffVoiceToTrack(0, 3)).toBe(3);
  });

  it("converts staffIdx 1, voice 0 to track 4", () => {
    expect(staffVoiceToTrack(1, 0)).toBe(4);
  });

  it("converts staffIdx 2, voice 1 to track 9", () => {
    expect(staffVoiceToTrack(2, 1)).toBe(9);
  });

  it("round-trips with trackToStaffIdx", () => {
    for (let s = 0; s < 4; s++) {
      for (let v = 0; v < 4; v++) {
        expect(trackToStaffIdx(staffVoiceToTrack(s, v))).toBe(s);
      }
    }
  });
});
