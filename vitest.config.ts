import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		globals: true,
		include: ["packages/*/tests/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			include: ["packages/*/src/**/*.ts"],
			// MuseScore ランタイムなしでは実行不可なファイルを除外
			exclude: ["**/snapshot.ts", "**/enumRegistry.ts"],
			thresholds: {
				lines: 85,
				functions: 85,
				branches: 60,
			},
		},
	},
	resolve: {
		alias: {
			"@musescore-linter/core": path.join(
				__dirname,
				"packages/core/src/index.ts",
			),
			"@musescore-linter/checkers": path.join(
				__dirname,
				"packages/checkers/src/index.ts",
			),
		},
	},
});
