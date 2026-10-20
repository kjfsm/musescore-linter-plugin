---
description: vitest 単体テストの責務と書き方。公開パッケージ・types-generator のテスト方針
paths:
  - "packages/*/tests/**"
  - "packages/**/*.test.*"
  - "examples/**/*.test.*"
---

# テスト方針

## ユニットテスト（各パッケージ collocated）

**対象**: 純粋関数のみ（型変換・パース・ヘルパ関数など）。

```ts
import { describe, it, expect } from "vitest";
import { someHelper } from "./some-helper";

it("handles empty score", () => {
  const result = someHelper(null);
  expect(result).toBeUndefined();
});
```

外部 API（GitHub fetch）や MuseScore ランタイムを触る関数はユニットテストに書かない。

## types-generator のテスト

`packages/types-generator/tests/` に parse / map-types / emit の単体テストがある。

```bash
# 特定ファイルのテストを実行
pnpm --filter @kjfsm/musescore-plugin-sdk-types-generator exec vitest run tests/parse.test.ts

# 特定テストを実行
pnpm --filter @kjfsm/musescore-plugin-sdk-types-generator exec vitest run -t "extracts classes"
```

## examples/ のテスト位置づけ

`examples/` は実際の MuseScore に読み込ませるリファレンス実装。自動テストよりも `pnpm build` が通ること・型エラーがないことを確認する。

## 実行コマンド

```bash
pnpm test           # turbo run test（全パッケージ）
pnpm typecheck      # turbo run typecheck
```
