import type {
  BarLineType,
  BarLineTypeName,
  BracketType,
  BracketTypeName,
  Chord,
  Key,
  KeyName,
  MuseScore,
  PlayingTechniqueType,
  PlayingTechniqueTypeName,
} from "@score-linter/musescore-api-types";

import { checkHostVersion, type HostVersionCheck, strictEnum } from "./plugin.ts";

/**
 * 実行中の MuseScore に結び付けたヘルパ。enum の値は版によって振り直されるので、
 * 値を焼き込まず、結び付けたホストの enum から引く。呼び出し側は enum を毎回渡さなくてよい。
 */
export interface ConnectedHelpers {
  readonly host: MuseScore;
  isGraceNote(chord: Chord): boolean;
  isGraceNoteBefore(chord: Chord): boolean;
  isGraceNoteAfter(chord: Chord): boolean;
  /** 実行中の版に無い値は null。 */
  barLineTypeName(value: BarLineType): BarLineTypeName | null;
  bracketTypeName(value: BracketType): BracketTypeName | null;
  playingTechniqueTypeName(value: PlayingTechniqueType): PlayingTechniqueTypeName | null;
  /** 調のシャープの数（フラットは負）。実行中の版に無い値は null。 */
  keyFifths(value: Key): number | null;
  checkVersion(): HostVersionCheck;
}

const GRACE_BEFORE = ["ACCIACCATURA", "APPOGGIATURA", "GRACE4", "GRACE16", "GRACE32"] as const;
const GRACE_AFTER = ["GRACE8_AFTER", "GRACE16_AFTER", "GRACE32_AFTER"] as const;

// 添字 - 7 がシャープの数
const KEYS_BY_FIFTHS: readonly KeyName[] = [
  "C_B",
  "G_B",
  "D_B",
  "A_B",
  "E_B",
  "B_B",
  "F",
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F_S",
  "C_S",
];

function memberName<N extends string>(
  enumObject: { readonly [K in N]: unknown } | undefined,
  value: unknown,
): N | null {
  if (!enumObject) return null;
  for (const name of Object.keys(enumObject) as N[]) {
    if (enumObject[name] === value) return name;
  }
  return null;
}

export interface ConnectOptions {
  /**
   * 型に有って実行中の版に無い enum のメンバを参照したら投げる。既定 true。
   * QML のエンジンが Proxy を持たなければ、この指定に関わらず素の enum を使う。
   */
  strict?: boolean;
}

export function connect(host: MuseScore, options: ConnectOptions = {}): ConnectedHelpers {
  const strict = (options.strict ?? true) && typeof Proxy !== "undefined";
  const noteType = strict ? strictEnum("NoteType", host.NoteType) : host.NoteType;

  const maskOf = (members: readonly (keyof typeof noteType)[]): number => {
    let mask = 0;
    for (const m of members) mask |= noteType[m] as unknown as number;
    return mask;
  };
  const before = maskOf(GRACE_BEFORE);
  const after = maskOf(GRACE_AFTER);

  return {
    host,
    isGraceNote: (chord) => chord.noteType !== noteType.NORMAL,
    isGraceNoteBefore: (chord) => ((chord.noteType as unknown as number) & before) !== 0,
    isGraceNoteAfter: (chord) => ((chord.noteType as unknown as number) & after) !== 0,
    // BarLineType と BracketType は名前を引くだけで、メンバを名指しで参照しないので
    // strictEnum で包む意味が無い（包むと未知のメンバを列挙したときに投げる）
    barLineTypeName: (value) => memberName(host.BarLineType, value),
    bracketTypeName: (value) => memberName(host.BracketType, value),
    playingTechniqueTypeName: (value) => memberName(host.PlayingTechniqueType, value),
    keyFifths: (value) => {
      const name = memberName(host.Key, value);
      const index = name === null ? -1 : KEYS_BY_FIFTHS.indexOf(name);
      return index === -1 ? null : index - 7;
    },
    checkVersion: () => checkHostVersion(host),
  };
}
