import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// QML から呼ばれる公開 API
const EXPORTS = ["buildSnapshot", "runAllCheckers", "getCheckerList"];

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
		// packages エイリアスを解決
		alias: {
			"@musescore-linter/core": path.join(ROOT, "packages/core/src/index.ts"),
			"@musescore-linter/checkers": path.join(
				ROOT,
				"packages/checkers/src/index.ts",
			),
		},
	});

	const raw = result.outputFiles[0].text;

	// QML の .import "file.js" as X で X.xxx にアクセスできるよう
	// トップレベル var として露出する
	const topLevel = EXPORTS.map((n) => `var ${n} = __bundle__.${n};`).join("\n");
	const output = [".pragma library", "", raw, "", topLevel, ""].join("\n");

	const distDir = path.join(ROOT, "dist");
	fs.mkdirSync(distDir, { recursive: true });
	fs.writeFileSync(path.join(distDir, "bundle.js"), output, "utf8");

	const sizeKb = (output.length / 1024).toFixed(1);
	console.log(`✓ Built dist/bundle.js (${sizeKb} KB)`);

	// ScoreLinter.qml をコピー（dist/ 内では bundle.js は同階層なのでパスを書き換える）
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
