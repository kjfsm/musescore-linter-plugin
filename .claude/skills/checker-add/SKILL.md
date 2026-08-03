---
name: checker-add
description: 新しい Checker を追加するときに使う。スキャフォールドの作成・Registry 登録・テスト追加・README 更新の 4 ステップを案内する。「新しい checker」「新チェック追加」「〜をチェックする機能」などのフレーズで起動。
---

# checker-add

新しい Checker を追加するための 4 ステップ手順。

Checker オブジェクトの必須フィールド・`options` の書き方・severity 基準・LintIR の構造・
`ir.index` を使うパフォーマンス上の注意点など、**契約そのもの**は
`.claude/rules/checker-contract.md` にまとまっている。ここではスキャフォールド〜登録〜
テスト〜README 更新までの手順だけを示す。

## ステップ 1: checker ファイルの作成

`packages/checkers/src/xxxChecker.ts` を作成する。on/off ペア型か独立チェック型かで選ぶ。

### 独立チェック型のテンプレート

実例: `packages/checkers/src/finalBarlineChecker.ts`

```ts
import type { Checker, Issue, LintIR } from "@musescore-linter/core";
import { createIssue } from "@musescore-linter/core";

export const xxxChecker: Checker = {
  id: "xxx-check", // kebab-case、他と重複禁止
  name: "〇〇チェック",
  description: "〇〇が〇〇になっていることを確認する",
  category: "notation", // articulation / dynamics / tempo / notation / slur-tie
  severity: "warning", // error / warning / info
  defaultEnabled: true,
  run(ir: LintIR): Issue[] {
    const issues: Issue[] = [];
    // ir.index.byKind / byStaffAndKind / byTick を使う（ir.events の全件ループは避ける）
    const targetIds = ir.index.byKind["TARGET_KIND"] ?? [];
    for (const id of targetIds) {
      const ev = ir.events[id];
      // 違反条件のチェック
      issues.push(
        createIssue(xxxChecker, {
          message: "〇〇が不足しています",
          partName: ev.staffIdx >= 0 ? ir.meta.parts[ev.staffIdx].partName : "",
          staffIdx: ev.staffIdx,
          measure: ev.measure,
          tick: ev.tick,
        }),
      );
    }
    return issues;
  },
};
```

### on/off ペア型のテンプレート

実例: `packages/checkers/src/pizzArcoChecker.ts`

```ts
import { createTextPairChecker } from "./base/textPairChecker.js";

export const xxxChecker = createTextPairChecker({
  id: "xxx-on-off",
  name: "〇〇 on/off チェック",
  description: "〇〇の開始と終了が対応していることを確認する",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPatterns: ["xxx"],
  offPatterns: ["yyy"],
  defaultState: "off",
  onLabel: "xxx",
  offLabel: "yyy",
});
```

## ステップ 2: `index.ts` への登録

`packages/checkers/src/index.ts` **1 ファイルだけ**を触る（他のファイルを触る必要はない）。
ただしその中で **3 箇所**追加が必要——1 箇所だけ足して終わりにしない。

```ts
// 1. 冒頭の import 群に追加（アルファベット順）
import { xxxChecker } from "./xxxChecker.js";

// 2. registerAll() 内の register 呼び出しに追加
export function registerAll(): void {
  reset();
  // ...既存の register(...) 呼び出し...
  register(xxxChecker);
}

// 3. 末尾の export {} ブロックに追加（アルファベット順）
export {
  // ...既存のエクスポート...
  xxxChecker,
};
```

3 番目（末尾の `export {}`）を忘れると、`registerAll()` 経由の実行（プラグイン・CLI・Web 版）は
動くが、`@musescore-linter/checkers` の公開 API から checker 単体を import できなくなる。

**QML（ScoreLinter.qml / qml/）と Settings の永続化キーは一切触らない。** 設定 UI は
`getCheckerList()`（`packages/core/src/linter.ts`）が返す checker メタデータ一覧から自動生成される。

## ステップ 3: テストの追加

`packages/checkers/tests/checkers.test.ts` に `describe`/`it` ブロックを追加する
（fixture は `packages/checkers/tests/helpers/irBuilder.ts` の `cleanIR()` / `quintetIR()` /
`buildIR()` で組み立てる。詳細は `.claude/rules/testing.md` を参照）。

```ts
import { xxxChecker } from "../src/xxxChecker.js";
import { cleanIR, K } from "./helpers/irBuilder.js";

describe("xxx-check checker", () => {
  it("正常なケース → 違反なし", () => {
    const ir = cleanIR([
      // 違反にならないイベント
    ]);
    expect(xxxChecker.run(ir)).toHaveLength(0);
  });

  it("違反ケース → 1件検出", () => {
    const ir = cleanIR([
      {
        kind: K.STAFF_TEXT,
        staff: 0,
        tick: 480,
        measure: 2,
        textNorm: "xxx",
        textRaw: "xxx",
      },
    ]);
    const issues = xxxChecker.run(ir);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe("xxx-check");
  });
});
```

checker が複雑でテストが長くなる場合は、`checkers.test.ts` に足さず
`packages/checkers/tests/xxxChecker.test.ts` として独立させてもよい
（`beatCrossingTieChecker.test.ts` / `slurTieArticulationConsistencyChecker.test.ts` が実例）。

## ステップ 4: README の更新

`README.md` の「チェック項目」表に 1 行追加する（列は「ルール / severity / 目的」の 3 列）。

```markdown
| 〇〇チェック | warning | 〇〇の開始と終了の対応漏れ・重複を検出 |
```

## チェックリスト

- [ ] `id` が kebab-case で他と重複していない
- [ ] `run()` 内で `try/catch` を書いていない（linter が全体で catch する）
- [ ] `ir.events` の全件ループではなく `ir.index` を使っている
- [ ] `packages/checkers/src/index.ts` の 3 箇所（import / register 呼び出し / 末尾 export）すべてに登録した
- [ ] 正例・負例の両方のテストを追加した
- [ ] README の「チェック項目」表を更新した
