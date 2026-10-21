import type { Position, Score, ScoreSpec } from "@score-linter/score-model";

export type Severity = "error" | "warning" | "info";

export interface OptionChoice {
  value: string;
  label: string;
}

interface OptionSpecBase {
  /** 設定画面に出す名前。 */
  label: string;
  description?: string;
}

/**
 * ルールが受け付ける設定項目の宣言。設定画面と CLI はこの宣言だけを見て入力欄と検証を作る。
 * QML の Repeater や JSON.stringify を通るので純データに保つ。
 */
export type OptionSpec =
  | (OptionSpecBase & { type: "boolean"; default: boolean })
  | (OptionSpecBase & { type: "select"; choices: readonly OptionChoice[]; default: string })
  | (OptionSpecBase & {
      type: "multiselect";
      choices: readonly OptionChoice[];
      default: readonly string[];
    });

export type OptionSpecs = Readonly<Record<string, OptionSpec>>;

type ChoiceValue<S> = S extends { choices: readonly (infer C)[] }
  ? C extends { value: infer V }
    ? V
    : never
  : never;

/** 宣言から推論した、正規化済みのオプションの値。 */
export type OptionValues<S extends OptionSpecs> = {
  -readonly [K in keyof S]: S[K] extends { type: "boolean" }
    ? boolean
    : S[K] extends { type: "select" }
      ? ChoiceValue<S[K]>
      : ChoiceValue<S[K]>[];
};

export type OptionValue = boolean | string | string[];

export type RuleCategory = "tempo" | "dynamics" | "articulation" | "slur-tie" | "notation";

/**
 * どれだけ確実な誤りを指すか。severity とは独立で、既定で ON にするかだけを決める。
 * `nursery` は誤検出の様子を見ているルールで、どのプリセットにも入らない。
 */
export type RuleTier = "recommended" | "pedantic" | "nursery";

/** 既定で ON にする段階の集合。`all` は `nursery` を含まない。 */
export type Preset = "recommended" | "all";

/** `internal` はルールではなく、エンジンやホストが出す指摘。 */
export type IssueCategory = RuleCategory | "internal";

export interface RuleMeta {
  name: string;
  description: string;
  category: RuleCategory;
  /**
   * このルールが出しうる指摘のうち最も重いもの。設定画面は実行前にこれを表示するので、
   * 実際の指摘から導くことはできない。これより重い指摘を報告するとエンジンが内部エラーにする。
   */
  severity: Severity;
  tier: RuleTier;
  /** README のルール一覧の「目的」欄（Markdown）。`pnpm docs:rules` が README に書き出す。 */
  docs?: string;
}

/** `{name}` を {@link Report.data} の値で埋める。 */
export type MessageData = Readonly<Record<string, string | number>>;

export interface Report<M extends string = string> {
  at: Position;
  /** {@link Rule.messages} のキー。パート名と小節番号は文面に入れない。lint-app が位置から表示する。 */
  messageId: M;
  data?: MessageData;
  detail?: Record<string, unknown> | null;
  /** 省略すると {@link RuleMeta.severity}。 */
  severity?: Severity;
}

export interface RuleContext<S extends OptionSpecs, M extends string = string> {
  score: Score;
  options: OptionValues<S>;
  report(report: Report<M>): void;
}

export interface RuleExample {
  score: ScoreSpec;
  /** ルールのオプションの生の値。 */
  options?: Readonly<Record<string, unknown>>;
}

/** invalid は 1 件以上の指摘、valid は指摘なしになる楽譜。組み込みルールはどちらも 1 つ以上持つ。 */
export interface RuleExamples {
  invalid: readonly RuleExample[];
  valid: readonly RuleExample[];
}

export interface Rule<S extends OptionSpecs = OptionSpecs, M extends string = string> {
  id: string;
  meta: RuleMeta;
  options: S;
  messages: Readonly<Record<M, string>>;
  examples?: RuleExamples;
  // メソッド記法にしておくと、オプションの型が違うルールを 1 つの配列に並べられる
  run(context: RuleContext<S, M>): void;
}

export interface IssueLocation {
  /** 楽譜全体に対する指摘では null。 */
  partId: string | null;
  staff: number | null;
  measure: number;
  tick: number;
}

export interface Issue {
  ruleId: string;
  severity: Severity;
  category: IssueCategory;
  message: string;
  at: IssueLocation;
  detail: Record<string, unknown> | null;
}
