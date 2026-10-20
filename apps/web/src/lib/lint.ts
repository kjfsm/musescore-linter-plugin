import { createLintApp, type ReportedIssue, type Settings } from "@score-linter/lint-app";
import { builtinRules } from "@score-linter/linter";
import { readMusicXmlBytes } from "@score-linter/reader-musicxml";
import type { Score } from "@score-linter/score-model";

export const app = createLintApp(builtinRules);

/**
 * 読み込んだファイル 1 件。Score を持っておくので、設定を変えたときに読み直さなくてよい。
 * `xml` は楽譜のプレビュー（OSMD）に、デコード済みの MusicXML をそのまま渡すため。
 */
export type ParsedFile =
  | { name: string; score: Score; xml: string; error?: undefined }
  | { name: string; score?: undefined; xml?: undefined; error: string };

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * バイト列を Score まで読む。重いのはこちらなので、設定を切り替えただけのときは
 * 呼び直さず {@link lintParsed} だけを走らせる。読めなかったファイルは error として返す
 * （UI の入出力の境界なので、例外を画面まで飛ばさない）。
 */
export function parseFile(name: string, bytes: Uint8Array): ParsedFile {
  try {
    const { score, xml } = readMusicXmlBytes(bytes);
    return { name, score, xml };
  } catch (error) {
    return { name, error: describeError(error) };
  }
}

/** `index` は parsed の中の位置。別のフォルダの同名ファイルを取り違えないためのキー。 */
export interface LintedFile {
  index: number;
  file: string;
  issues: ReportedIssue[];
}

/** 読めなかったファイルは飛ばすが、`index` は parsed の位置のまま保つ。 */
export function lintParsed(parsed: ParsedFile[], settings: Settings): LintedFile[] {
  return parsed
    .map((p, index) =>
      p.score === undefined
        ? undefined
        : { index, file: p.name, issues: app.lint(p.score, settings).issues },
    )
    .filter((r): r is LintedFile => r !== undefined);
}
