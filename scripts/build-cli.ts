import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist-cli", "musescore-lint.mjs");

function alias(name: string, file: string): [string, string] {
	return [`@musescore-linter/${name}`, path.join(ROOT, file)];
}

async function main() {
	const pkg = JSON.parse(
		fs.readFileSync(path.join(ROOT, "packages/cli/package.json"), "utf8"),
	) as { version: string };

	await esbuild.build({
		entryPoints: [path.join(ROOT, "packages/cli/src/main.ts")],
		outfile: OUT,
		bundle: true,
		platform: "node",
		format: "esm",
		target: "node22",
		// QML 向けバンドルと違い、Node で読めればよいので minify はしない（スタックトレース優先）
		minify: false,
		// shebang は packages/cli/src/main.ts の先頭にあり、esbuild がそのまま先頭へ残す
		define: { __CLI_VERSION__: JSON.stringify(pkg.version) },
		alias: Object.fromEntries([
			alias("core", "packages/core/src/index.ts"),
			alias("checkers", "packages/checkers/src/index.ts"),
			alias("source-musicxml", "packages/source-musicxml/src/index.ts"),
		]),
	});

	fs.chmodSync(OUT, 0o755);
	const sizeKb = (fs.statSync(OUT).size / 1024).toFixed(1);
	console.log(`✓ Built dist-cli/musescore-lint.mjs (${sizeKb} KB)`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
