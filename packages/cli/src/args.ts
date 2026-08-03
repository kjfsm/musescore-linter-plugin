import type { Checker, CheckerOptionValue, Severity } from "@musescore-linter/core";
import { findOptionSpec, parseCheckerOptionText } from "@musescore-linter/core";

export type OutputFormat = "pretty" | "json" | "github";

/** `--rule-option=<ruleId>.<key>=<value>` を割っただけの生の指定。値の妥当性は未検証。 */
export interface RawRuleOption {
  ruleId: string;
  key: string;
  value: string;
}

/** 非ゼロ終了の閾値。"none" はどんな issue でも 0 を返す。 */
export type FailOn = Severity | "none";

export interface CliOptions {
  files: string[];
  format: OutputFormat;
  dumpIR: boolean;
  /** 明示的に無効化する checker id */
  disabledRules: string[];
  /** 指定があればこの checker だけを有効にする */
  onlyRules: string[];
  /** checker 個別のオプション指定（出現順。同じキーは後勝ち） */
  ruleOptions: RawRuleOption[];
  failOn: FailOn;
  color: boolean;
  help: boolean;
  version: boolean;
  listRules: boolean;
}

export class UsageError extends Error {}

const FORMATS: OutputFormat[] = ["pretty", "json", "github"];
const FAIL_ON: FailOn[] = ["error", "warning", "info", "none"];

const DEFAULTS: CliOptions = {
  files: [],
  format: "pretty",
  dumpIR: false,
  disabledRules: [],
  onlyRules: [],
  ruleOptions: [],
  failOn: "error",
  color: true,
  help: false,
  version: false,
  listRules: false,
};

function requireValue(flag: string, value: string | undefined): string {
  if (value === undefined || value === "") {
    throw new UsageError(`${flag} には値が必要です（例: ${flag}=xxx）`);
  }
  return value;
}

function oneOf<T extends string>(flag: string, value: string, allowed: T[]): T {
  if (!(allowed as string[]).includes(value)) {
    throw new UsageError(
      `${flag} に指定できるのは ${allowed.join(" / ")} です（指定値: ${value}）`,
    );
  }
  return value as T;
}

/**
 * `--rule-option=<ruleId>.<key>=<value>` の payload 部分を割る。
 *
 * 外側のパーサが**最初の `=`** で切るので、ここに来る文字列は `<ruleId>.<key>=<value>`。
 * ruleId は kebab-case、key は lowerCamel でどちらも `.` を含まないため、
 * 最初の `.` を境目にして曖昧さなく割れる。
 */
function parseRuleOptionArg(flag: string, payload: string): RawRuleOption {
  const eq = payload.indexOf("=");
  if (eq === -1) {
    throw new UsageError(`${flag} は <ruleId>.<key>=<value> の形式で指定してください`);
  }
  const lhs = payload.slice(0, eq);
  const dot = lhs.indexOf(".");
  if (dot <= 0 || dot === lhs.length - 1) {
    throw new UsageError(`${flag} は <ruleId>.<key>=<value> の形式で指定してください`);
  }
  return { ruleId: lhs.slice(0, dot), key: lhs.slice(dot + 1), value: payload.slice(eq + 1) };
}

/**
 * 引数を解析する。`--flag=value` 形式のみ受け付け、`--flag value` は受け付けない
 * （ファイル名との区別が曖昧になるため）。
 */
export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    ...DEFAULTS,
    files: [],
    disabledRules: [],
    onlyRules: [],
    ruleOptions: [],
  };
  let noMoreFlags = false;

  for (const arg of argv) {
    if (noMoreFlags || !arg.startsWith("-")) {
      options.files.push(arg);
      continue;
    }
    if (arg === "--") {
      noMoreFlags = true;
      continue;
    }

    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const value = eq === -1 ? undefined : arg.slice(eq + 1);

    switch (flag) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-v":
      case "--version":
        options.version = true;
        break;
      case "--list-rules":
        options.listRules = true;
        break;
      case "--json":
        options.format = "json";
        break;
      case "--dump-ir":
        options.dumpIR = true;
        break;
      case "--format":
        options.format = oneOf(flag, requireValue(flag, value), FORMATS);
        break;
      case "--fail-on":
        options.failOn = oneOf(flag, requireValue(flag, value), FAIL_ON);
        break;
      case "--no-rule":
        options.disabledRules.push(requireValue(flag, value));
        break;
      case "--rule":
        options.onlyRules.push(requireValue(flag, value));
        break;
      case "--rule-option":
        options.ruleOptions.push(parseRuleOptionArg(flag, requireValue(flag, value)));
        break;
      case "--no-color":
        options.color = false;
        break;
      default:
        throw new UsageError(`不明なオプション: ${flag}`);
    }
  }

  return options;
}

/** `runAllCheckers` に渡す enabledRules を組み立てる。 */
export function resolveEnabledRules(
  options: Pick<CliOptions, "disabledRules" | "onlyRules">,
  allRuleIds: string[],
): Record<string, boolean> {
  const enabled: Record<string, boolean> = {};
  if (options.onlyRules.length > 0) {
    for (const id of allRuleIds) enabled[id] = false;
    for (const id of options.onlyRules) enabled[id] = true;
  }
  for (const id of options.disabledRules) enabled[id] = false;
  return enabled;
}

/**
 * `runAllCheckers` に渡す ruleOptions を組み立てる。
 *
 * 人間が打った指定を受ける境界なので、`resolveCheckerOptions` のように黙って既定へ
 * 落とさず、未知の checker / key / 値はここでエラーにする。同じキーの重複指定は後勝ち。
 */
export function resolveRuleOptions(
  options: Pick<CliOptions, "ruleOptions">,
  checkers: Checker[],
): Record<string, Record<string, CheckerOptionValue>> {
  const byId = new Map(checkers.map((c) => [c.id, c]));
  const out: Record<string, Record<string, CheckerOptionValue>> = {};

  for (const { ruleId, key, value } of options.ruleOptions) {
    const checker = byId.get(ruleId);
    if (!checker) {
      throw new UsageError(
        `チェッカー '${ruleId}' は存在しません（--list-rules で一覧を確認できます）`,
      );
    }
    const spec = findOptionSpec(checker, key);
    if (!spec) {
      const keys = (checker.options ?? []).map((s) => s.key);
      throw new UsageError(
        keys.length > 0
          ? `チェッカー '${ruleId}' に設定 '${key}' はありません（指定できるのは ${keys.join(" / ")}）`
          : `チェッカー '${ruleId}' に設定できる項目はありません`,
      );
    }
    const parsed = parseCheckerOptionText(spec, value);
    if (!parsed.ok) throw new UsageError(`--rule-option=${ruleId}.${key}: ${parsed.error}`);

    if (!out[ruleId]) out[ruleId] = {};
    out[ruleId][key] = parsed.value;
  }

  return out;
}

/** 指定された id が実在する checker かを検証する。 */
export function assertKnownRules(
  options: Pick<CliOptions, "disabledRules" | "onlyRules">,
  allRuleIds: string[],
): void {
  const known = new Set(allRuleIds);
  for (const id of [...options.onlyRules, ...options.disabledRules]) {
    if (!known.has(id)) {
      throw new UsageError(
        `チェッカー '${id}' は存在しません（--list-rules で一覧を確認できます）`,
      );
    }
  }
}

export const HELP_TEXT = `musescore-lint — MusicXML の楽譜を静的解析する

使い方:
  musescore-lint [オプション] <ファイル...>

  ファイルは .musicxml / .xml（score-partwise）と、圧縮形式の .mxl を受け付ける。

オプション:
  --format=<pretty|json|github>  出力形式（既定: pretty）
                                 github は GitHub Actions のアノテーション形式
  --json                         --format=json の別名
  --dump-ir                      issue ではなく LintIR を JSON 出力する
                                 （ファイル 1 つなら LintIR そのもの、複数なら
                                   [{ file, ir }, ...] の配列になる）
  --rule=<id>                    指定した checker だけを有効にする（複数指定可）
  --no-rule=<id>                 指定した checker を無効にする（複数指定可）
  --rule-option=<id>.<key>=<値>  checker 個別の設定（複数指定可、同じキーは後勝ち）
                                 複数選択の値はカンマ区切り
                                 指定できる key は --list-rules で確認できる
  --fail-on=<error|warning|info|none>
                                 この severity 以上の issue があれば終了コード 1
                                 （既定: error。none はつねに 0）
  --no-color                     色付けをやめる
  --list-rules                   checker の一覧を表示して終了
  -h, --help                     このヘルプ
  -v, --version                  バージョン

終了コード:
  0  --fail-on の閾値以上の issue なし
  1  閾値以上の issue あり
  2  実行エラー（ファイルが読めない・パースできない等）
`;
