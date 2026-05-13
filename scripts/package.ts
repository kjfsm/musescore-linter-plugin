import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PLUGIN_DIR = "musescore-linter";

function collectFiles(
	srcDir: string,
	zipPrefix: string,
	files: Record<string, Uint8Array>,
) {
	for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
		const srcPath = path.join(srcDir, entry.name);
		const zipPath = `${zipPrefix}/${entry.name}`;
		if (entry.isDirectory()) {
			collectFiles(srcPath, zipPath, files);
		} else {
			files[zipPath] = fs.readFileSync(srcPath);
		}
	}
}

function main() {
	const pkg = JSON.parse(
		fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
	) as { version: string };
	const version = pkg.version;
	const zipName = `musescore-linter-plugin-${version}.zip`;

	const distDir = path.join(ROOT, "dist");
	if (!fs.existsSync(distDir)) {
		console.error(
			"dist/ が存在しません。先に pnpm run build を実行してください。",
		);
		process.exit(1);
	}

	const files: Record<string, Uint8Array> = {};

	collectFiles(distDir, PLUGIN_DIR, files);
	files[`${PLUGIN_DIR}/README.md`] = fs.readFileSync(
		path.join(ROOT, "README.md"),
	);

	const zipped = zipSync(files);
	const zipPath = path.join(ROOT, zipName);
	fs.writeFileSync(zipPath, zipped);

	console.log(`✓ Created ${zipName}`);
}

main();
