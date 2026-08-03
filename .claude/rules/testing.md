---
description: vitest 単体テストの責務・irBuilder 使い方
paths:
  - "packages/*/tests/**"
  - "apps/*/tests/**"
  - "packages/**/*.test.*"
  - "apps/**/*.test.*"
---

# テスト方針

## ユニットテスト（`packages/*/tests/**/*.test.ts`, `apps/*/tests/**/*.test.ts`）

**対象**: 各 Checker の `run(ir)` 関数。純粋関数として irBuilder で組み立てた LintIR を渡してテストする。
テストランナーは vitest（設定は `vitest.config.ts`、`include` にこの 2 パターンを指定）。

checker のテストは `packages/checkers/tests/checkers.test.ts` に集約されている。冒頭の `run()`
ヘルパーが `reset()` → `registerAll()` → `ensureDerived(ir)` → `runAllCheckers(ir, enabledRules)`
をまとめて行う。個別 checker の `run(ir)` を直に呼ぶテストと、`run()` ヘルパー経由で registry 全体を
通すテストの両方が存在する。

```ts
// 典型的なテストパターン（cleanIR に違反イベントを 1 件足す）
const ir = cleanIR([
  {
    kind: K.STAFF_TEXT,
    staff: 0,
    tick: 480,
    measure: 2,
    textNorm: "pizz.",
    textRaw: "pizz.",
  },
]);
const issues = pizzArcoChecker.run(ir);
expect(issues).toHaveLength(1);
expect(issues[0].severity).toBe("warning");
```

**`packages/checkers/tests/helpers/irBuilder.ts`**: テスト用の fixture ヘルパー。`buildIR` /
`CANONICAL`（`K` = `elementKinds`、`BK` = `barlineKinds` としてエクスポート）は
`@musescore-linter/core` の再エクスポートで、実体はそちら（`packages/core/src/irBuilder.ts`）にある。
このファイル自身が持つのは `cleanIR(extra)`（全 checker をパスする最小 IR に追加イベントを足す）と
`quintetIR(extra)`（弦楽五重奏 5 staff 版）の 2 つの fixture ビルダだけ。

## カバレッジ方針

- 正例（違反なし）と負例（違反あり）の両方を書く
- `ir.index.byKind` / `byStaffAndKind` を使うパスと global scope（`staffIdx: -1` / `scope: "global"`）を通るパスをそれぞれカバーする
- 新しい checker を追加したら必ず対応するテストケースを追加する

## 実行コマンド

```bash
pnpm test              # vitest run（ルートの vitest.config.ts、全パッケージ横断）
pnpm test:coverage      # vitest run --coverage
pnpm dev                # vitest（watch モード）
pnpm pipeline           # turbo run typecheck test build build:plugin build:cli package
```

`test` スクリプトを持つのはルートだけで、全パッケージのテストを 1 回で走らせる
（各パッケージの `typecheck` 完了が前提）。`pnpm typecheck` はルート自身の `src/` と
`scripts/` だけを見るので、全体を確かめるときは `pnpm pipeline` を使う。パッケージ単位に分けていた頃は alias だけが違う
`vitest.config.ts` が 5 本並んでいたが、全体で 1 秒未満なので分割する利点がない。
通常の開発では `pnpm test` で十分。
