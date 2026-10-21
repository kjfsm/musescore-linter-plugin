import type { BarLineType, Chord, MuseScore } from "@score-linter/musescore-api-types";
import { describe, expect, it } from "vitest";

import { connect } from "../src/connect.ts";

// 実際の MuseScore のどの版とも違う値。焼き込んだ値ではなく、結び付けたホストの
// enum から引いていることを確かめるため。
const NoteType = {
  NORMAL: 100,
  ACCIACCATURA: 1,
  APPOGGIATURA: 2,
  GRACE4: 4,
  GRACE16: 8,
  GRACE32: 16,
  GRACE8_AFTER: 32,
  GRACE16_AFTER: 64,
  GRACE32_AFTER: 128,
  INVALID: 255,
};
const BarLineType = { NORMAL: 200, DOUBLE: 204, END: 206 };
const BracketType = { NORMAL: 300, BRACE: 301 };
const PlayingTechniqueType = { Natural: 400, Pizzicato: 401 };
const Key = { C_B: 500, F: 506, C: 507, G: 508, C_S: 514, DELTA_ENHARMONIC: 515 };

function host(extra: Partial<Record<string, unknown>> = {}): MuseScore {
  return {
    NoteType,
    BarLineType,
    BracketType,
    PlayingTechniqueType,
    Key,
    mscoreMajorVersion: 4,
    mscoreMinorVersion: 7,
    ...extra,
  } as unknown as MuseScore;
}

const chord = (noteType: number) => ({ noteType }) as unknown as Chord;

describe("connect", () => {
  it("グレースノートの判定をホストの NoteType で行う", () => {
    const helpers = connect(host());
    expect(helpers.isGraceNote(chord(100))).toBe(false);
    expect(helpers.isGraceNote(chord(2))).toBe(true);
    expect(helpers.isGraceNoteBefore(chord(2))).toBe(true);
    expect(helpers.isGraceNoteBefore(chord(64))).toBe(false);
    expect(helpers.isGraceNoteAfter(chord(64))).toBe(true);
  });

  it("enum の値からメンバ名を引き、実行中の版に無い値は null", () => {
    const helpers = connect(host());
    expect(helpers.barLineTypeName(206 as unknown as BarLineType)).toBe("END");
    expect(helpers.barLineTypeName(999 as unknown as BarLineType)).toBeNull();
    expect(helpers.bracketTypeName(301 as never)).toBe("BRACE");
    expect(helpers.playingTechniqueTypeName(401 as never)).toBe("Pizzicato");
  });

  it("調をホストの Key から引いてシャープの数にする", () => {
    const helpers = connect(host());
    expect(helpers.keyFifths(507 as never)).toBe(0);
    expect(helpers.keyFifths(508 as never)).toBe(1);
    expect(helpers.keyFifths(506 as never)).toBe(-1);
    expect(helpers.keyFifths(500 as never)).toBe(-7);
    expect(helpers.keyFifths(514 as never)).toBe(7);
    expect(helpers.keyFifths(515 as never)).toBeNull();
  });

  it("ホストが enum を持たなければ名前は引けず null", () => {
    const helpers = connect(host({ BracketType: undefined }));
    expect(helpers.bracketTypeName(301 as never)).toBeNull();
  });

  it("strict では、型に有って実行中の版に無い NoteType のメンバの参照で投げる", () => {
    const { GRACE32_AFTER: _, ...older } = NoteType;
    expect(() => connect(host({ NoteType: older }))).toThrow(/NoteType\.GRACE32_AFTER/);
    expect(() => connect(host({ NoteType: older }), { strict: false })).not.toThrow();
  });

  it("版の照合を結び付けたホストで行う", () => {
    expect(connect(host({ mscoreMajorVersion: 3 })).checkVersion().ok).toBe(false);
  });
});
