import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "dist");

await mkdir(distDir, { recursive: true });

// TS のエントリポイントを 1 ファイルにバンドルする。各エクスポートは、トップレベルに
// 再バインドする小さなフッタを介して公開する。これにより QML 側の
// `import "x.js" as Logic` が `Logic.run` や `Logic.<その他のエクスポート>` を
// 認識できるようになる。
const exportNames = ["run"];

await build({
  entryPoints: [resolve(here, "src/logic.ts")],
  outfile: resolve(distDir, "logic.js"),
  bundle: true,
  format: "iife",
  globalName: "__musescorePlugin",
  target: "es2017",
  platform: "neutral",
  legalComments: "none",
  footer: {
    js: exportNames.map((n) => `var ${n} = __musescorePlugin.${n};`).join("\n"),
  },
});

await copyFile(resolve(here, "plugin.qml"), resolve(distDir, "plugin.qml"));

console.log("dist/plugin.qml と dist/logic.js をビルドしました");
