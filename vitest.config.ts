import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // パッケージごとに 1 プロジェクト。以前は packages/*/vitest.config.ts を 5 本置いて
    // いたが、中身は alias だけの差分だった。その alias 自体、各パッケージの
    // package.json が "main": "src/index.ts" を指しているので不要（外して
    // 全テストが通ること・バンドルが byte 単位で同一になることを確認済み）。
    //
    // ルートを pnpm workspace のメンバーから外してあるので（S2）、turbo run test は
    // 各パッケージの test を 1 回ずつ走らせる。ここのルート設定はカバレッジを
    // 1 本の lcov にまとめるためのもので、CI では両方を使い分けている。
    projects: [
      {
        test: {
          name: "packages",
          globals: true,
          include: ["packages/*/tests/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "apps",
          globals: true,
          include: ["apps/*/tests/**/*.test.ts"],
        },
      },
    ],
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
});
