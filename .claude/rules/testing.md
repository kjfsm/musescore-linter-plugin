---
description: vitest 単体テストの責務・irBuilder 使い方・loader の仕組み
paths:
  - "packages/*/tests/**"
  - "packages/**/*.test.*"
  - "test/**"
---

# テスト方針

## ユニットテスト（`test/runner.js`）

**対象**: 各 Checker の `run(ir)` 関数。純粋関数として irBuilder で組み立てた LintIR を渡してテストする。

```js
// 典型的なテストパターン
const ir = irBuilder.buildIR({
  events: [
    { kind: "tempo", tick: 0, staffIdx: -1, textNorm: "♩=120" },
  ],
  parts: [{ staffIdx: 0, partName: "Violin I" }]
});
const issues = checker.run(ir);
assert.strictEqual(issues.length, 0);
```

**`test/loader.js` の仕組み**: `.pragma library` / `.import` ディレクティブを文字列から剥がし、`vm.runInNewContext()` で評価する。QML ランタイムなしで Node.js 上でテスト可能。

**`test/irBuilder.js`**: テスト用の最小 LintIR を構築するビルダ。`buildIR({ events, parts })` を使い、`index`・`meta`・`derived` を自動補完する。

## カバレッジ方針

- 正例（違反なし）と負例（違反あり）の両方を書く
- `ir.index.byKind` / `byStaffAndKind` を使うパスと global scope（staffIdx === -1）を通るパスをそれぞれカバーする
- 新しい checker を追加したら必ず対応するテストケースを追加する

## 実行コマンド

```bash
pnpm test           # turbo run test（全パッケージ）
node test/runner.js # ルートの runner を直接実行
```
