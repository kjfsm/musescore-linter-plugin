import type { Severity } from "@musescore-linter/core";

export type OutputFormat = "pretty" | "json" | "github";

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
 * 引数を解析する。`--flag=value` 形式のみ受け付け、`--flag value` は受け付けない
 * （ファイル名との区別が曖昧になるため）。
 */
export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    ...DEFAULTS,
    files: [],
    disabledRules: [],
    onlyRules: [],
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
