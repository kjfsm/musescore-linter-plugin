import type { ScoreElement } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import {
  isBarLine,
  isClef,
  isDynamic,
  isExpression,
  isKeySig,
  isPlayTechAnnotation,
  isRehearsalMark,
  isStaffText,
  isSystemText,
  isTempo,
  isTimeSig,
} from "../src/element-types.js";

const fake = (name: string) => ({ name }) as unknown as ScoreElement;

describe("element-type predicates", () => {
  const cases: Array<[(el: ScoreElement | null | undefined) => boolean, string, string[]]> = [
    [isDynamic, "Dynamic", ["Expression", "StaffText"]],
    [isExpression, "Expression", ["Dynamic", "StaffText"]],
    [isTempo, "TempoText", ["Dynamic", "StaffText"]],
    [isStaffText, "StaffText", ["SystemText", "Dynamic"]],
    [isSystemText, "SystemText", ["StaffText", "Dynamic"]],
    [isRehearsalMark, "RehearsalMark", ["StaffText"]],
    [isPlayTechAnnotation, "PlayTechAnnotation", ["StaffText"]],
    [isBarLine, "BarLine", ["Clef"]],
    [isKeySig, "KeySig", ["TimeSig"]],
    [isTimeSig, "TimeSig", ["KeySig"]],
    [isClef, "Clef", ["KeySig"]],
  ];

  for (const [predicate, matchName, nonMatchNames] of cases) {
    it(`${predicate.name} matches only "${matchName}"`, () => {
      expect(predicate(fake(matchName))).toBe(true);
      for (const name of nonMatchNames) {
        expect(predicate(fake(name))).toBe(false);
      }
      expect(predicate(null)).toBe(false);
      expect(predicate(undefined)).toBe(false);
    });
  }

  it("isTempo also matches legacy name 'Tempo'", () => {
    expect(isTempo(fake("Tempo"))).toBe(true);
    expect(isTempo(fake("TempoText"))).toBe(true);
  });
});
