import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const repoRoot = resolve(pkgRoot, "../..");

interface Config {
  repository: string;
  ref: string;
  headers: string[];
  enumHeaders?: string[];
}

const configPath = join(pkgRoot, "config.json");
const raw = await readFile(configPath, "utf8");
const config = JSON.parse(raw) as Config;

const outDir = resolve(repoRoot, "packages/types/src/generated");
const cacheDir = resolve(pkgRoot, ".cache");

const result = await generate({
  repository: config.repository,
  ref: config.ref,
  headers: config.headers,
  ...(config.enumHeaders !== undefined && { enumHeaders: config.enumHeaders }),
  outDir,
  cacheDir,
});

console.log(`generated from ${config.repository}@${result.ref} (${result.commitSha})`);
if (result.warnings.length > 0) {
  console.log(`warnings (${result.warnings.length}):`);
  for (const w of result.warnings.slice(0, 50)) {
    console.log(`  - ${w}`);
  }
  if (result.warnings.length > 50) {
    console.log(`  ... and ${result.warnings.length - 50} more`);
  }
}
