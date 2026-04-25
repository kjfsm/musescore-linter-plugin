import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// QML から呼ばれる公開 API
const EXPORTS = ["buildSnapshot", "runAllCheckers", "getCheckerList"];

async function main() {
const result = await esbuild.build({
  entryPoints: [path.join(ROOT, "src/bundle-entry.ts")],
  bundle: true,
  format: "iife",
  globalName: "__bundle__",
  target: "es2017", // QML の V4 エンジンは ES2017 相当をサポート
  write: false,
  // packages エイリアスを解決
  alias: {
    "@musescore-linter/core": path.join(ROOT, "packages/core/src/index.ts"),
    "@musescore-linter/checkers": path.join(ROOT, "packages/checkers/src/index.ts"),
  },
});

const raw = result.outputFiles[0].text;

// QML の .import "file.js" as X で X.xxx にアクセスできるよう
// トップレベル var として露出する
const topLevel = EXPORTS.map((n) => `var ${n} = __bundle__.${n};`).join("\n");
const output = [
  ".pragma library",
  "",
  raw,
  "",
  topLevel,
  "",
].join("\n");

const distDir = path.join(ROOT, "dist");
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "bundle.js"), output, "utf8");

  const sizeKb = (output.length / 1024).toFixed(1);
  console.log(`✓ Built dist/bundle.js (${sizeKb} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
