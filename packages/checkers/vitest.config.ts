import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@musescore-linter/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
});
