export type Severity = "error" | "warning" | "info";

/**
 * 型の生成元 MuseScore バージョン（`generatedFrom.tag`）と実行中の版の照合結果。
 * `buildSnapshot` にホスト（`MuseScore { }` オブジェクト）を渡したときのみ設定される。
 * MuseScore 経路（`@musescore-linter/source-musescore`）でのみ埋まる診断用フィールドで、
 * 他のソース（MusicXML 等）からの IR では常に undefined。
 */
export interface HostVersionInfo {
  ok: boolean;
  generatedTag: string; // 例: "v4.7.3"
  running: string; // 例: "4.7"
  message?: string; // !ok のときのみ設定
}

export interface NoteInfo {
  pitch: number; // MIDI 音高（0-127）。不明は -1
  tpc: number; // tonal pitch class（綴り）。C = 14
  line: number; // 譜表上の位置（音部記号に応じた音名+オクターブ）
  accidentalShown: boolean; // この符頭に臨時記号が表示されているか
}

export interface LintEvent {
  id: number;
  tick: number;
  measure: number;
  staffIdx: number; // -1 = global scope
  voice: number;
  kind: string; // canonical 文字列
  type: "chord" | "rest" | "text" | "barline" | "other";
  textNorm: string;
  textRaw: string;
  scope: "staff" | "global";
  subtype: unknown;
  subStyle: unknown;
  tempo: number | null;
  barlineType?: unknown;
  barlineKind?: string;
  duration?: { numerator: number; denominator: number };
  // chord/rest のみ。連符（3連符等）のブラケット内なら true。ブラケット自体が
  // グルーピングを示すので、拍のグルーピングを見る checker はこれを対象外にする。
  tuplet?: boolean;
  stemDirection?: number; // chord のみ。DirectionV 生値（0 auto / 1 up / 2 down）
  beamMode?: number; // chord のみ。BeamMode 生値
  articulations?: string[]; // chord のみ。アーティキュレーション名（"Staccato" 等）
  notes?: NoteInfo[]; // chord のみ。各音符の綴り情報（音高/tpc/譜表位置/臨時記号表示）
}

export interface IRIndex {
  byTick: Record<string, number[]>;
  byKind: Record<string, number[]>;
  byStaff: Record<string, number[]>;
  byStaffAndKind: Record<string, Record<string, number[]>>;
}

export interface HairpinInfo {
  staffIdx: number;
  startTick: number;
  endTick: number;
}

export interface SlurInfo {
  staffIdx: number;
  voice: number;
  startTick: number;
  endTick: number;
}

export interface TieInfo {
  staffIdx: number;
  voice: number;
  startTick: number;
  endTick: number;
  // タイ両端ノートの MIDI 音高。端点が欠落/無音程の場合は null。
  startPitch: number | null;
  endPitch: number | null;
}

/**
 * 小節の枠組み（拍子・先頭 tick・長さ）。拍の位置を知る必要がある checker 向け。
 * 取得できなかった小節はそもそも配列に載らないので、参照側は「無ければ判定しない」でよい。
 */
export interface MeasureInfo {
  measure: number; // 1 始まり。LintEvent.measure と同じ番号体系
  startTick: number;
  ticks: number; // 実際の小節長（tick）。アウフタクト・不完全小節の検出に使う
  timeSigN: number; // 拍子の分子
  timeSigD: number; // 拍子の分母
}

/** システムブラケット（パート括弧）の種類。MusicXML の `group-symbol` と同じ語彙。 */
export type PartGroupSymbol = "bracket" | "square" | "brace" | "line";

/**
 * システムブラケット 1 本。`startStaffIdx` から `staffCount` 本の連続する譜表を覆う。
 * 入れ子は「同じ譜表を覆う括弧が複数ある」状態として表現され、深さは持たない
 * （どちらが内側かは `staffCount` の小ささで決まる）。
 */
export interface PartGroupInfo {
  symbol: PartGroupSymbol;
  startStaffIdx: number;
  staffCount: number;
}

export interface IRMeta {
  parts: { staffIdx: number; partName: string }[];
  // 括弧を持たない・読み取れないソースでは空配列。
  partGroups: PartGroupInfo[];
  firstMusicTickByStaff: (number | null)[];
  lastTick: number;
  hairpins: HairpinInfo[];
  slurs: SlurInfo[];
  ties: TieInfo[];
  // 小節番号昇順。拍子が取れないソース・小節では空/欠番になりうる。
  measures: MeasureInfo[];
  // `buildSnapshot` にホストを渡したときのみ設定される版照合結果（診断用。checker は参照しない）。
  hostVersion?: HostVersionInfo;
}

export interface IRDerived {
  _eventsCount: number;
  firstChordByStaff: Record<number, { tick: number; measure: number }>;
  // chord イベント id → アーティキュレーション名
  articulationsByChordId: Record<number, string[]>;
  // staffIdx → スラー（startTick 昇順）
  slursByStaff: Record<number, SlurInfo[]>;
  // staffIdx → タイ（startTick 昇順）
  tiesByStaff: Record<number, TieInfo[]>;
  // `${staffIdx}:${measure}:${voice}` → リズム署名（声部横断の同リズム判定キー）
  rhythmByStaffMeasure: Record<string, string>;
  // `${staffIdx}:${measure}:${voice}` → chord（tick 昇順）。読み取り専用として扱うこと。
  // 小節×パート単位で chord を引く checker が staff 全体を毎回 filter + sort しないための索引。
  chordsByStaffMeasure: Record<string, LintEvent[]>;
}

export interface CanonicalKinds {
  elementKinds: {
    CHORD: string;
    REST: string;
    BAR_LINE: string;
    TEMPO_TEXT: string;
    STAFF_TEXT: string;
    SYSTEM_TEXT: string;
    EXPRESSION: string;
    REHEARSAL_MARK: string;
    DYNAMIC: string;
    UNKNOWN: string;
  };
  barlineKinds: {
    DOUBLE: string;
    FINAL: string;
    REPEAT_START: string;
    REPEAT_END: string;
    REPEAT_BOTH: string;
    OTHER: string;
    UNKNOWN: string;
  };
}

export interface LintIR {
  events: LintEvent[];
  index: IRIndex;
  meta: IRMeta;
  registry: { canonical: CanonicalKinds };
  derived: IRDerived | null;
}

export interface Issue {
  ruleId: string;
  severity: Severity;
  category: string;
  message: string;
  partName: string;
  staffIdx: number;
  measure: number;
  tick: number;
  detail: Record<string, unknown> | null;
}

export type CheckerOptionValue = boolean | string | string[];

export interface CheckerOptionChoice {
  value: string;
  label: string;
}

interface CheckerOptionSpecBase {
  key: string;
  label: string; // UI 表示名
  description?: string;
}

/**
 * checker が受け付ける設定項目の宣言。UI（Web / QML）と CLI はこの宣言だけを見て
 * 入力欄とバリデーションを組み立てる。QML の Repeater model や JSON.stringify を通るので
 * **純データに保つこと**（関数・getter を入れてはいけない）。
 */
export type CheckerOptionSpec =
  | (CheckerOptionSpecBase & { type: "boolean"; default: boolean })
  | (CheckerOptionSpecBase & {
      type: "select";
      choices: CheckerOptionChoice[];
      default: string;
    })
  | (CheckerOptionSpecBase & {
      type: "multiselect";
      choices: CheckerOptionChoice[];
      default: string[];
    });

export interface Checker {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: Severity;
  defaultEnabled: boolean;
  options?: CheckerOptionSpec[];
  /**
   * 第 2 引数は **未検証の生値**。値の出所は localStorage / QML の JSON / CLI 文字列で
   * どれも信用できないため、`options` を宣言した checker は冒頭で
   * `resolveCheckerOptions(this.options, options)` を通してから使うこと。
   * 引数を取らない既存の checker はそのままこの型を満たす。
   */
  run(ir: LintIR, options?: Record<string, unknown>): Issue[];
}

export interface TextPairCheckerConfig {
  id: string;
  name: string;
  description?: string;
  category?: string;
  severity?: Severity;
  defaultEnabled?: boolean;
  onPatterns: string[];
  offPatterns: string[];
  defaultState: "on" | "off";
  onLabel: string;
  offLabel: string;
}
