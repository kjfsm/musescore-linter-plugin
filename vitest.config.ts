import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    include: ["packages/*/tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@musescore-linter/core": path.join(__dirname, "packages/core/src/index.ts"),
      "@musescore-linter/checkers": path.join(
        __dirname,
        "packages/checkers/src/index.ts"
      ),
    },
  },
});
