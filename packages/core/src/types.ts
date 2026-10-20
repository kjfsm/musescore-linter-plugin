import type { BarlineKind, ElementKind, TextKind } from "./enumRegistry.js";

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

interface EventBase {
  id: number;
  tick: number;
  measure: number;
  staffIdx: number; // -1 = global scope
  voice: number;
  scope: "staff" | "global";
}

export interface ChordEvent extends EventBase {
  kind: "chord";
  duration?: { numerator: number; denominator: number };
  // 連符（3連符等）のブラケット内なら true。ブラケット自体が
  // グルーピングを示すので、拍のグルーピングを見る checker はこれを対象外にする。
  tuplet?: boolean;
  stemDirection?: number; // DirectionV 生値（0 auto / 1 up / 2 down）
  beamMode?: number; // BeamMode 生値
  articulations?: string[]; // アーティキュレーション名（"Staccato" 等）
  notes?: NoteInfo[];
}

export interface RestEvent extends EventBase {
  kind: "rest";
  duration?: { numerator: number; denominator: number };
  tuplet?: boolean;
}

export interface BarlineEvent extends EventBase {
  kind: "bar_line";
  barlineKind: BarlineKind;
}

export interface TextEvent extends EventBase {
  kind: TextKind;
  textNorm: string;
  textRaw: string;
  tempo: number | null;
  // MuseScore 経路でのみ埋まる要素の subtype 生値。MusicXML 経路では常に null。
  subtype: unknown;
}

export type LintEvent = ChordEvent | RestEvent | BarlineEvent | TextEvent;

/**
 * kind に対応するイベント型。`Extract<LintEvent, { kind: K }>` では書けない —
 * TextEvent の kind は共用体なので、個々のテキスト kind に対して never になる。
 */
export type EventOfKind<K extends ElementKind> = K extends "chord"
  ? ChordEvent
  : K extends "rest"
    ? RestEvent
    : K extends "bar_line"
      ? BarlineEvent
      : TextEvent;

type IdsByKind = Partial<Record<ElementKind, number[]>>;

export interface IRIndex {
  byTick: Record<string, number[]>;
  byKind: IdsByKind;
  byStaff: Record<string, number[]>;
  byStaffAndKind: Record<string, IdsByKind>;
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
  // partId は同じパートに属する譜表で同じ値になる。partName は同名の別パート
  // （Horn in F が 2 つ等）がありうるので、譜表をパートに束ねるキーには使えない。
  parts: { staffIdx: number; partId: string; partName: string }[];
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
  readonly firstChordByStaff: Readonly<Record<number, { tick: number; measure: number }>>;
  // chord イベント id → アーティキュレーション名
  readonly articulationsByChordId: Readonly<Record<number, readonly string[]>>;
  // staffIdx → スラー（startTick 昇順）
  readonly slursByStaff: Readonly<Record<number, readonly SlurInfo[]>>;
  // staffIdx → タイ（startTick 昇順）
  readonly tiesByStaff: Readonly<Record<number, readonly TieInfo[]>>;
  // `${staffIdx}:${measure}:${voice}` → リズム署名（声部横断の同リズム判定キー）
  readonly rhythmByStaffMeasure: Readonly<Record<string, string>>;
  // `${staffIdx}:${measure}:${voice}` → chord（tick 昇順）
  readonly chordsByStaffMeasure: Readonly<Record<string, readonly ChordEvent[]>>;
}

export interface LintIR {
  events: LintEvent[];
  index: IRIndex;
  meta: IRMeta;
}

/** checker が受け取る IR。`derived` を作ってからでないと渡せない。 */
export interface IndexedIR extends LintIR {
  readonly derived: IRDerived;
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
  /**
   * この checker が出しうる issue のうち**最も重い** severity。
   *
   * `createIssue` の既定値であると同時に、設定 UI のバッジ表示に使われる
   * （実行前でも出るので、実際の issue から導出することはできない）。
   * 条件によって軽い severity も出す checker は、重いほうをここに書くこと。
   */
  severity: Severity;
  defaultEnabled: boolean;
  options?: CheckerOptionSpec[];
  /**
   * 第 2 引数は **未検証の生値**。値の出所は localStorage / QML の JSON / CLI 文字列で
   * どれも信用できないため、`options` を宣言した checker は冒頭で
   * `resolveCheckerOptions(this.options, options)` を通してから使うこと。
   * 引数を取らない既存の checker はそのままこの型を満たす。
   */
  run(ir: IndexedIR, options?: Record<string, unknown>): Issue[];
}
