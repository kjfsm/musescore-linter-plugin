import type { BarLineType, BarLineTypeEnum } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { classifyBarlineKind } from "../src/barline.js";

// Fake runtime enum object, as the MuseScore host would provide via `host.BarLineType`.
// Deliberately uses different int values than any real MuseScore version to prove
// classification resolves through the runtime object rather than baked-in constants.
const FAKE_RT: BarLineTypeEnum = {
  NORMAL: 100,
  BROKEN: 101,
  DOTTED: 102,
  END: 103,
  DOUBLE: 104,
  START_REPEAT: 105,
  END_REPEAT: 106,
  END_START_REPEAT: 107,
  HEAVY: 108,
  DOUBLE_HEAVY: 109,
  REVERSE_END: 110,
} as unknown as BarLineTypeEnum;

function v(name: keyof typeof FAKE_RT): BarLineType {
  return FAKE_RT[name] as unknown as BarLineType;
}

describe("classifyBarlineKind", () => {
  it("classifies final barlines", () => {
    expect(classifyBarlineKind(v("END"), FAKE_RT)).toBe("final");
    expect(classifyBarlineKind(v("REVERSE_END"), FAKE_RT)).toBe("final");
  });

  it("classifies double barline", () => {
    expect(classifyBarlineKind(v("DOUBLE"), FAKE_RT)).toBe("double");
  });

  it("distinguishes repeat barlines by start / end / both", () => {
    expect(classifyBarlineKind(v("START_REPEAT"), FAKE_RT)).toBe("repeat_start");
    expect(classifyBarlineKind(v("END_REPEAT"), FAKE_RT)).toBe("repeat_end");
    expect(classifyBarlineKind(v("END_START_REPEAT"), FAKE_RT)).toBe("repeat_both");
  });

  it("classifies other barlines", () => {
    expect(classifyBarlineKind(v("NORMAL"), FAKE_RT)).toBe("other");
    expect(classifyBarlineKind(v("BROKEN"), FAKE_RT)).toBe("other");
    expect(classifyBarlineKind(v("DOTTED"), FAKE_RT)).toBe("other");
    expect(classifyBarlineKind(v("HEAVY"), FAKE_RT)).toBe("other");
    expect(classifyBarlineKind(v("DOUBLE_HEAVY"), FAKE_RT)).toBe("other");
  });

  it("falls back to 'other' for an unrecognized value", () => {
    expect(classifyBarlineKind(999 as unknown as BarLineType, FAKE_RT)).toBe("other");
  });
});
