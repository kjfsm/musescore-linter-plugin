import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

async function main() {
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, "src/bundle-entry.ts")],
    bundle: true,
    minify: true,
    legalComments: "none",
    format: "iife",
    globalName: "__bundle__",
    target: "es2017", // QML の V4 エンジンは ES2017 相当をサポート
    write: false,
  });

  const [bundle] = result.outputFiles;
  if (!bundle) throw new Error("esbuild が出力ファイルを返しませんでした");
  const raw = bundle.text;

  // QML の import "bundle.js" as Bundle からは、トップレベルの var しか見えない
  const output = [".pragma library", "", raw, "", "var api = __bundle__;", ""].join("\n");

  const distDir = path.join(ROOT, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "bundle.js"), output, "utf8");

  const sizeKb = (output.length / 1024).toFixed(1);
  console.log(`✓ Built dist/bundle.js (${sizeKb} KB)`);

  // ScoreLinter.qml をコピー（dist/ 内では bundle.js は同階層なのでパスを書き換える）
  // バージョンは package.json を単一情報源とし、ビルド時に注入する
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
    version: string;
  };
  const buildDate = new Date().toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
  const qmlContent = fs
    .readFileSync(path.join(ROOT, "ScoreLinter.qml"), "utf8")
    .replace(/import "dist\/bundle\.js"/, 'import "bundle.js"')
    .replace(/__PLUGIN_VERSION__/g, pkg.version)
    .replace("__BUILD_DATE__", `ver. ${buildDate}`);
  fs.writeFileSync(path.join(distDir, "ScoreLinter.qml"), qmlContent, "utf8");
  console.log("✓ Copied ScoreLinter.qml");

  // qml/ ディレクトリをコピー
  const qmlSrc = path.join(ROOT, "qml");
  const qmlDst = path.join(distDir, "qml");
  fs.mkdirSync(qmlDst, { recursive: true });
  for (const file of fs.readdirSync(qmlSrc)) {
    if (file.endsWith(".qml")) {
      fs.copyFileSync(path.join(qmlSrc, file), path.join(qmlDst, file));
    }
  }
  console.log("✓ Copied qml/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
