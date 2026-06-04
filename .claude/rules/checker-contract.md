---
description: Checker の id/run 契約・LintIR 使い方・severity 基準・ir.index 優先
paths:
  - "packages/checkers/src/**"
  - "packages/core/src/**"
  - "src/checkers/**"
  - "src/**/*.js"
---

# Checker 契約

## Checker オブジェクトの必須フィールド

```js
{
  id: string,                              // kebab-case、Registry キー
  name: string,                            // UI 表示名
  description: string,                     // 設定タブの説明
  category: "articulation" | "dynamics" | "tempo" | "notation" | string,
  severity: "error" | "warning" | "info",  // 検出 issue のデフォルト severity
  defaultEnabled: boolean,
  run: function(ir) -> Issue[]             // LintIR を受け取り Issue 配列を返す
}
```

## Issue の生成

Issue は必ず `src/issue.js` の `createIssue(checker, fields)` 経由で生成する。

```js
{
  ruleId: string,
  severity: "error" | "warning" | "info",
  category: string,
  message: string,
  partName: string,   // global スコープは ""
  staffIdx: number,   // global スコープは -1
  measure: number,    // 不定は 0
  tick: number,       // 不定は 0
  detail: object | null
}
```

on/off ペア型の checker は `src/checkers/base/textPairChecker.js` の `createTextPairChecker()` を利用する。

## severity 基準

| レベル | 用途 |
|---|---|
| `error` | 再生・出版に支障が出るレベルの漏れ（冒頭テンポなし、冒頭ダイナミクスなし等） |
| `warning` | on/off の対応漏れ（pizz. のまま終わる、senza sord. 忘れ等） |
| `info` | あると望ましい記載の漏れ（複縦線等） |

## LintIR の構造

```js
{
  events: [ { id, kind, type, tick, measure, staffIdx, voice, textNorm, textRaw,
              // chord のみ: stemDirection?, beamMode?, articulations?: string[]
              ... } ],
  index: {
    byTick,         // tick → Event[]
    byKind,         // kind → Event[]
    byStaff,        // staffIdx → Event[]
    byStaffAndKind  // staffIdx → kind → Event[]
    // staffIdx === -1 は global scope（全パート共通の注記）
  },
  meta: {
    parts: [{staffIdx, partName}], firstMusicTickByStaff, lastTick,
    hairpins: [{staffIdx, startTick, endTick}],
    slurs:    [{staffIdx, voice, startTick, endTick}],
  },
  registry: { canonical: { elementKinds, barlineKinds } },
  derived: {
    firstChordByStaff, annotationIdsByTick, globalAnnotationIdsByTick,
    articulationsByChordId,   // chord イベント id → アーティキュレーション名[]
    slursByStaff,             // staffIdx → SlurInfo[]（startTick 昇順）
    rhythmByStaffMeasure,     // `${staffIdx}:${measure}:${voice}` → リズム署名
  }
}
```

`ir.staves` / `ir.unresolvedAnnotations` は廃止。global scope の注記は `ir.index.byStaff[-1]` で参照する。

## パフォーマンスガイドライン

1. **`ir.index` を使う** — `ir.index.byKind[K]` / `byStaffAndKind[s][K]` / `byTick[t]` から必要なイベントだけ取り出す。`ir.events` の全件ループは避ける。
2. **`ir.derived` に共有前処理を乗せる** — 複数 checker が共有する前処理（例: `firstChordByStaff`）は `linter.js` の `ensureDerived` に追加し、`ir.derived.xxx` から参照する。
3. **例外は catch しない** — checker 内で `try/catch` を書く必要はない。`linter.runAllCheckers` が全体で catch し、失敗しても他の checker は走る。

## Checker 追加の標準手順

詳細は `/checker-add` skill を参照。
1. `src/checkers/xxxChecker.js` に `var checker = { ... }` を定義
2. `src/checkers/index.js` に `import` と `Registry.register(X.checker)` を 1 行ずつ追加（**唯一の同期点**）
3. `test/runner.js` にテストケースを追加（fixture は `irBuilder.buildIR({...})` で構築）
4. README の「チェック項目」表を更新
