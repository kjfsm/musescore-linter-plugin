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
