import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    include: ["packages/*/tests/**/*.test.ts", "apps/*/tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // apps 側は React 非依存のロジック層（lib/）だけを見る。components/ は
      // jsdom のテスト基盤が無く描画テストを書けないので対象外。
      // packages 側は除外しない。snapshot.ts は「MuseScore ランタイム無しでは
      // 実行不可」として除外されていたが、tests/snapshot.test.ts がモックで
      // 実行しており事実と違った（451 行が無計測のままだった）。
      include: ["packages/*/src/**/*.ts", "apps/*/src/lib/**/*.ts"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@musescore-linter/core": path.join(__dirname, "packages/core/src/index.ts"),
      "@musescore-linter/checkers": path.join(__dirname, "packages/checkers/src/index.ts"),
      "@musescore-linter/source-musescore": path.join(
        __dirname,
        "packages/source-musescore/src/index.ts",
      ),
      "@musescore-linter/source-musicxml": path.join(
        __dirname,
        "packages/source-musicxml/src/index.ts",
      ),
      "@musescore-linter/cli": path.join(__dirname, "packages/cli/src/index.ts"),
    },
  },
});
