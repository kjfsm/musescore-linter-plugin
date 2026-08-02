import { registerAll } from "@musescore-linter/checkers";
import type { FileResult } from "@musescore-linter/cli";
import type { LintIR } from "@musescore-linter/core";
import { getCheckerList, reset, runAllCheckers, setLevel } from "@musescore-linter/core";
import { buildIRFromBytes } from "@musescore-linter/source-musicxml";

/** パース済みのファイル 1 件。IR を保持するので再 lint で読み直さなくてよい。 */
export type ParsedFile =
  | { name: string; ir: LintIR; error?: undefined }
  | { name: string; ir?: undefined; error: string };

let registered = false;

/**
 * checker レジストリはモジュールレベルの配列なので、多重登録を避けて作り直す。
 * ブラウザではプロセスが 1 つなので初回だけでよい（CLI の registerCheckers と同じ理由）。
 */
function ensureCheckersRegistered(): void {
  if (registered) return;
  // checker ごとの検出件数ログは開発者コンソールを汚すので出さない
  setLevel("warn");
  reset();
  registerAll();
  registered = true;
}

export function allRuleIds(): string[] {
  ensureCheckersRegistered();
  return getCheckerList().map((c) => c.id);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * バイト列を IR まで読む。重いのはこちら側なので、ルールの ON/OFF を切り替えた
 * だけのときは呼び直さず {@link lintParsed} だけを再実行する。
 *
 * パース失敗を error として返すのは、ここが UI の I/O 境界だから。
 * 「checker 内で catch しない」規約は checker 実装に対するもので、ここは対象外。
 */
export function parseFile(name: string, bytes: Uint8Array): ParsedFile {
  ensureCheckersRegistered();
  try {
    return { name, ir: buildIRFromBytes(bytes) };
  } catch (error) {
    return { name, error: describeError(error) };
  }
}

/** パース済みの IR に checker を掛ける。パースに失敗したファイルは飛ばす。 */
export function lintParsed(
  parsed: ParsedFile[],
  enabledRules: Record<string, boolean>,
): FileResult[] {
  ensureCheckersRegistered();
  return parsed
    .filter((p): p is ParsedFile & { ir: LintIR } => p.ir !== undefined)
    .map((p) => ({ file: p.name, issues: runAllCheckers(p.ir, enabledRules) }));
}
