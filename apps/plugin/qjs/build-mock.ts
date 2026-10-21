import * as path from "node:path";

import * as esbuild from "esbuild";

const here = import.meta.dirname;

await esbuild.build({
  entryPoints: [path.join(here, "mock-entry.ts")],
  outfile: path.join(here, "..", "dist-qjs", "mock.js"),
  bundle: true,
  format: "iife",
  globalName: "__mock__",
  target: "es2017",
});
