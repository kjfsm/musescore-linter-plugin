---
description: vitest 単体テストの責務・buildScore とテストヘルパの使い方
paths:
  - "packages/*/tests/**"
  - "apps/*/tests/**"
  - "packages/**/*.test.*"
  - "apps/**/*.test.*"
---

# テスト方針

## ユニットテスト（`packages/*/tests/**/*.test.ts`, `apps/*/tests/**/*.test.ts`）

テストランナーは vitest（設定はルートの `vitest.config.ts`）。`packages/*/tests` と `apps/*/tests` の 2 プロジェクトで、
`pnpm test` が全パッケージを 1 回で走らせる。

### ルール（`packages/linter/tests/`）

**対象**: 組み込みの各ルール。`buildScore(spec)`（`@score-linter/score-model`）で必要な要素だけを書いた
`Score` を作り、ルールを 1 つだけ有効にして走らせ、返った `Issue` を検証する。
テストファイルは `src/rules/` のファイルと対にする（`tempo.ts` ↔ `tempo.test.ts`）。

`packages/linter/tests/helpers.ts`:

- `runRule(rule, score, options?)` — そのルールだけを有効にした `createLinter([rule])` で lint する。
  `options` は生の値で渡す（エンジンが正規化する）。
- `runAll(score, enabled?)` — 段階を問わず `builtinRules` をすべて有効にして走らせる。
- `cleanScore(extra?, partNames?)` / `quintetScore(extra?)` — どの組み込みルールにも引っかからない最小の楽譜
  （冒頭にテンポ表記、各パートの 1 音目に強弱記号）に、`extra` の要素を足したもの。違反を 1 つだけ足して検証する。

```ts
const score = cleanScore({ annotations: [{ staff: 0, measure: 2, tick: 480, text: "pizz." }] });
const issues = runRule(pizzArco, score);
expect(issues).toHaveLength(1);
expect(issues[0]).toMatchObject({ severity: "warning", at: { staff: 0, measure: 2 } });
```

指摘の `message` に位置は入らない（プレースホルダのまま）。位置は `at`、他の位置は `detail` で検証する。

### 他の層

| 場所                                  | 検証すること                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/score-model/tests/`         | 問い合わせ関数・テキストの解釈（`interpretAnnotation`）                           |
| `packages/reader-musicxml/tests/`     | MusicXML / .mxl から作った Score                                                  |
| `packages/reader-musescore/tests/`    | MuseScore のモックから作った Score                                                |
| `packages/lint-app/tests/`            | 設定・並べ替え・件数・整形・スナップショット                                      |
| `apps/cli/tests/`                     | 引数・出力。`golden.test.ts` は 3 曲の検出結果を `fixtures/golden/` と比べる       |
| `apps/plugin/tests/`                  | バンドルが呼ぶ `lint.ts`（MuseScore のモックを使う）。`conformance.test.ts` は MuseScore 版と MusicXML 版の Score の一致を見る |

## カバレッジ方針

- 正例（違反なし）と負例（違反あり）の両方を書く
- 楽譜全体に付いた注記（`staff` も `partId` も無い）とパートに付いた注記の両方を通るルールは、両方を通す
- 新しいルールを追加したら必ず対応するテストケースを追加する
- golden の更新（`pnpm vitest run -u`）は、検出結果を意図して変えたときだけ。差分の理由をコミットに書く

## 実行コマンド

```bash
pnpm test              # vitest run（全パッケージ横断）
pnpm test:coverage     # vitest run --coverage
pnpm dev               # vitest（watch モード）
pnpm pipeline          # turbo run typecheck test build package
```

`pnpm typecheck` はルート自身の `tsc --noEmit` だけを見る。各パッケージの型検査（プラグインの
`tsconfig.bundle.json` を含む）は `pnpm pipeline` が回す。
