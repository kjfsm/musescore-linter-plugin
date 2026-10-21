---
name: rule-add
description: 新しい lint ルールを追加するときに使う。ルールの定義（messages・examples・docs）・builtinRules への登録・テスト追加・README 再生成の 4 ステップを案内する。「新しいルール」「新チェック追加」「〜をチェックする機能」などのフレーズで起動。
---

# rule-add

新しいルールを追加するための 4 ステップ手順。

`defineRule` の形・`report` の約束・severity 基準・楽譜の引き方など、**契約そのもの**は
`.claude/rules/rule-contract.md` にまとまっている。ここではファイル作成〜登録〜
テスト〜README 再生成までの手順だけを示す。

## ステップ 0: 必要な情報が Score にあるか

ルールは `Score` だけを見る。判定に要る情報が `packages/score-model/src/types.ts` に無い、または
テキストの解釈（奏法・強弱・テンポ・反復記号）が `interpretAnnotation` に無いときは、ルールで補わず
先に `score-model`（と、値を埋める `reader-musicxml` / `reader-musescore`）に足す。
その判断が型の変更を伴うなら、ここで止めて相談する。

## ステップ 1: ルールの定義

`packages/linter/src/rules/<export 名>.ts` を 1 ルール 1 ファイルで作る。他のルールと共有する補助は
`packages/linter/src/rules/support/` に置く。

### 独立したルール

実例: `packages/linter/src/rules/openingTempo.ts`

```ts
import { defineRule } from "../engine.ts";

export const xxxCheck = defineRule({
  id: "xxx-check", // kebab-case、他と重複禁止
  meta: {
    name: "〇〇チェック",
    description: "〇〇が〇〇になっていることを確認する",
    category: "notation", // articulation / dynamics / tempo / notation / slur-tie
    severity: "warning", // 出しうる最も重いもの
    tier: "nursery", // 新しいルールは試験中から。様子を見て recommended / pedantic に上げる
    docs: "〇〇が不足している箇所", // README の「目的」欄（Markdown）
  },
  options: {},
  messages: {
    missing: "〇〇（{text}）が不足しています", // パート名・小節番号は入れない
  },
  examples: {
    invalid: [{ score: { annotations: [{ staff: 0, tick: 0, text: "xxx" }] } }],
    valid: [{ score: {} }],
  },
  run({ score, report }) {
    // score-model の問い合わせ関数で必要な要素だけを引く
    for (const staff of score.staves) {
      report({ at: { staff: staff.index, measure: 1, tick: 0 }, messageId: "missing", data: { text: "…" } });
    }
  },
});
```

### on/off の奏法ペア

`packages/linter/src/rules/support/techniquePairs.ts` の共通関数で作る（実例: `pizzArco.ts`）。`on` / `off` は
`score-model` の `Technique`。新しい奏法なら、`Technique` 型と `packages/score-model/src/interpret.ts` の表記の表に足す。

## ステップ 2: `builtinRules` への登録

`packages/linter/src/rules/index.ts` **1 ファイルだけ**を触る。`import` 文と、`builtinRules` 配列へのエントリの
2 箇所を足す。配列の並びがそのまま実行順・設定画面の並び・README の表の並びになるので、関連するペアの隣に入れる。

配列に足し忘れると、ルールを作っただけで一切実行されない。

**QML・Web の UI・設定の保存キーは触らない。** 設定 UI は `meta` と `options` から自動生成される。

## ステップ 3: テストの追加

`examples` は `packages/linter/tests/examples.test.ts` が自動で回す。境界のケースは、話題の近いテストファイル
（`packages/linter/tests/<話題>.test.ts`）に `describe`/`it` を足す（詳細は `.claude/rules/testing.md`）。

```ts
import { xxxCheck } from "../src/rules/xxxCheck.ts";
import { cleanScore, runRule } from "./helpers.ts";

describe("xxx-check", () => {
  it("違反が 2 つあれば 2 件指摘する", () => {
    const score = cleanScore({
      annotations: [
        { staff: 0, measure: 2, tick: 480, text: "xxx" },
        { staff: 1, measure: 2, tick: 480, text: "xxx" },
      ],
    });
    expect(runRule(xxxCheck, score).map((i) => i.at.staff)).toEqual([0, 1]);
  });
});
```

`cleanScore()` は組み込みのすべてのルールに引っかからない楽譜で、新しいルールが `cleanScore()` を
指摘してしまうと `tests/clean.test.ts` が落ちる。

## ステップ 4: README の再生成

`pnpm docs:rules` で README の「チェック項目」表を `meta` から作り直す（手で書かない。CI が差分を見る）。
`docs/notation-checklist.md` に該当項目があれば状態を ✅ にする。

## チェックリスト

- [ ] `id` が kebab-case で他と重複していない
- [ ] `meta.severity` が出しうる最も重い severity になっている
- [ ] `run` 内で `try/catch` を書いていない（エンジンが catch する）
- [ ] `messages` の文面にパート名・小節番号を入れていない（他の位置は `{{measure:key}}` と `detail`）
- [ ] `meta.docs` と、`examples` の invalid・valid をそれぞれ 1 つ以上書いた
- [ ] `packages/linter/src/rules/index.ts` の 2 箇所（import / `builtinRules`）に追加した
- [ ] 境界のケースのテストを追加した
- [ ] `pnpm docs:rules` で README を作り直した
