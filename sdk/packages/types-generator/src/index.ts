import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { emit } from "./emit.js";
import { fetchHeaders, resolveCommitSha } from "./fetch.js";
import { parseHeader } from "./parse.js";

export interface GenerateOptions {
  repository: string;
  ref: string;
  headers: string[];
  /** enum 定義のみを取り出すヘッダ群。クラス定義は無視する。 */
  enumHeaders?: string[];
  cacheDir: string;
  outDir: string;
}

export interface GenerateResult {
  warnings: string[];
  commitSha: string;
  ref: string;
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  // 最初にコミット SHA を解決する。レート制限に当たるなどして ref を実コミットに固定できない
  // 場合に早期に失敗させるため。cacheDir 配下に ref ごとにキャッシュするので、再実行で
  // 不要に GitHub API を叩くことはない。
  const commitSha = await resolveCommitSha({
    repository: opts.repository,
    ref: opts.ref,
    cacheDir: opts.cacheDir,
  });

  const fetched = await fetchHeaders({
    repository: opts.repository,
    ref: opts.ref,
    headers: opts.headers,
    cacheDir: opts.cacheDir,
  });

  const perFile = fetched.map((f) => ({
    path: f.path,
    result: parseHeader(f.source),
  }));

  const enumFetched = await fetchHeaders({
    repository: opts.repository,
    ref: opts.ref,
    headers: opts.enumHeaders ?? [],
    cacheDir: opts.cacheDir,
  });

  const enumOnlyFiles = enumFetched.map((f) => ({
    path: f.path,
    result: parseHeader(f.source),
  }));

  const out = emit({ perFile, enumOnlyFiles });

  await mkdir(opts.outDir, { recursive: true });
  await writeFile(join(opts.outDir, "plugin-api.ts"), out.pluginApi, "utf8");
  await writeFile(join(opts.outDir, "enums.ts"), out.enums, "utf8");
  await writeFile(
    join(opts.outDir, "_meta.ts"),
    renderMeta(opts.repository, opts.ref, commitSha),
    "utf8",
  );

  return { warnings: out.warnings, commitSha, ref: opts.ref };
}

function renderMeta(repository: string, ref: string, sha: string): string {
  // 生成時刻はあえて記録しない — 出力は (repository, ref, headers) の純粋関数で
  // なければならない。これにより CI のドリフトチェックが安定する。
  return `// @kjfsm/musescore-plugin-sdk-types-generator が自動生成したファイル。手で編集しないこと。
export const generatedFrom = {
  repository: ${JSON.stringify(repository)},
  tag: ${JSON.stringify(ref)},
  commitSha: ${JSON.stringify(sha)},
} as const;
`;
}

void dirname; // ESM の解決でインポートの副作用が出ないように保持する
