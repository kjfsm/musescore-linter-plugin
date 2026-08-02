import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@musescore-linter/core": resolve(__dirname, "../core/src/index.ts"),
      "@musescore-linter/checkers": resolve(__dirname, "../checkers/src/index.ts"),
      "@musescore-linter/source-musicxml": resolve(__dirname, "../source-musicxml/src/index.ts"),
    },
  },
});
