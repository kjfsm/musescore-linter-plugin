import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // パッケージごとの vitest.config.ts は置かない。各パッケージの exports が src を指すので alias が要らず、
    // turbo 側も //#test（ルートタスク 1 本）でこの設定を使う。
    projects: [
      {
        test: {
          name: "packages",
          include: ["packages/*/tests/**/*.test.ts", "tools/*/tests/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "apps",
          include: ["apps/*/tests/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      // apps 側は React 非依存のロジック層（lib/）だけを見る。components/ は
      // jsdom のテスト基盤が無く描画テストを書けないので対象外。
      // packages 側は除外しない。snapshot.ts は「MuseScore ランタイム無しでは
      // 実行不可」として除外されていたが、tests/snapshot.test.ts がモックで
      // 実行しており事実と違った（451 行が無計測のままだった）。
      include: ["packages/*/src/**/*.ts", "apps/cli/src/**/*.ts", "apps/*/src/lib/**/*.ts"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 60,
      },
    },
  },
});
