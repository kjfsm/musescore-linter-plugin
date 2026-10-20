---
name: rule-add
description: 新しい lint ルールを追加するときに使う。ルールの定義・builtinRules への登録・テスト追加・README 更新の 4 ステップを案内する。「新しいルール」「新チェック追加」「〜をチェックする機能」などのフレーズで起動。
---

# rule-add

新しいルールを追加するための 4 ステップ手順。

`defineRule` の形・`report` の約束・severity 基準・楽譜の引き方など、**契約そのもの**は
`.claude/rules/rule-contract.md` にまとまっている。ここではファイル作成〜登録〜
テスト〜README 更新までの手順だけを示す。

## ステップ 0: 必要な情報が Score にあるか

ルールは `Score` だけを見る。判定に要る情報が `packages/score-model/src/types.ts` に無い、または
テキストの解釈（奏法・強弱・テンポ・反復記号）が `interpretAnnotation` に無いときは、ルールで補わず
先に `score-model`（と、値を埋める `reader-musicxml` / `reader-musescore`）に足す。
その判断が型の変更を伴うなら、ここで止めて相談する。

## ステップ 1: ルールの定義

`packages/linter/src/rules/` の、主題の近いファイルに足す
（`tempo.ts`・`dynamics.ts`・`notation.ts`・`slurTie.ts`・`techniquePairs.ts` …。合うものが無ければ新しいファイル）。

### 独立したルール

実例: `packages/linter/src/rules/notation.ts` の `finalBarline`

```ts
import { defineRule } from "../engine.js";

export const xxxCheck = defineRule({
  id: "xxx-check", // kebab-case、他と重複禁止
  meta: {
    name: "〇〇チェック",
    description: "〇〇が〇〇になっていることを確認する",
    category: "notation", // articulation / dynamics / tempo / notation / slur-tie
    severity: "warning", // 出しうる最も重いもの
    defaultEnabled: true,
  },
  options: {},
  run({ score, report }) {
    // score-model の問い合わせ関数で必要な要素だけを引く
    for (const staff of score.staves) {
      // 違反条件のチェック
      report({
        at: { staff: staff.index, measure: 1, tick: 0 },
        message: "〇〇が不足しています", // パート名・小節番号は入れない
      });
    }
  },
});
```

### on/off の奏法ペア

`packages/linter/src/rules/techniquePairs.ts` の `techniquePair({ id, name, description, on, off, onLabel, offLabel })`
で作る（実例: `pizzArco`）。`on` / `off` は `score-model` の `Technique`。新しい奏法なら、
`Technique` 型と `packages/score-model/src/interpret.ts` の表記の表に足す。

## ステップ 2: `builtinRules` への登録

`packages/linter/src/rules/index.ts` **1 ファイルだけ**を触る。`import` 文と、`builtinRules` 配列へのエントリの
2 箇所を足す。配列の並びがそのまま実行順・設定画面の並びになるので、関連するペアの隣に入れる。

配列に足し忘れると、ルールを作っただけで一切実行されない。

**QML・Web の UI・設定の保存キーは触らない。** 設定 UI は `meta` と `options` から自動生成される。

## ステップ 3: テストの追加

`packages/linter/tests/` の、ステップ 1 のファイルと対になるテストファイルに `describe`/`it` を足す
（詳細は `.claude/rules/testing.md`）。

```ts
import { runRule, cleanScore } from "./helpers.js";
import { xxxCheck } from "../src/rules/notation.js";

describe("xxx-check", () => {
  it("正常な楽譜では指摘しない", () => {
    expect(runRule(xxxCheck, cleanScore())).toEqual([]);
  });

  it("違反があれば 1 件指摘する", () => {
    const score = cleanScore({
      annotations: [{ staff: 0, measure: 2, tick: 480, text: "xxx" }],
    });
    const issues = runRule(xxxCheck, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ ruleId: "xxx-check", at: { staff: 0, measure: 2 } });
  });
});
```

`cleanScore()` は組み込みのすべてのルールに引っかからない楽譜で、新しいルールが `cleanScore()` を
指摘してしまうと `tests/clean.test.ts` が落ちる。

## ステップ 4: README の更新

`README.md` の「チェック項目」表に 1 行追加する（列は「ルール / severity / 目的」の 3 列）。
`docs/notation-checklist.md` に該当項目があれば状態を ✅ にする。

## チェックリスト

- [ ] `id` が kebab-case で他と重複していない
- [ ] `meta.severity` が出しうる最も重い severity になっている
- [ ] `run` 内で `try/catch` を書いていない（エンジンが catch する）
- [ ] `message` にパート名・小節番号を入れていない（他の位置は `{{measure:key}}` と `detail`）
- [ ] `packages/linter/src/rules/index.ts` の 2 箇所（import / `builtinRules`）に追加した
- [ ] 正例・負例の両方のテストを追加した
- [ ] README の「チェック項目」表を更新した
