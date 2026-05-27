---
name: checker-add
description: 新しい Checker を追加するときに使う。スキャフォールドの作成・Registry 登録・テスト追加・README 更新の 4 ステップを案内する。「新しい checker」「新チェック追加」「〜をチェックする機能」などのフレーズで起動。
---

# checker-add

新しい Checker を追加するための 4 ステップ手順。

## ステップ 1: checker ファイルの作成

`src/checkers/xxxChecker.js` を作成する。on/off ペア型か独立チェック型かで選ぶ。

### 独立チェック型のテンプレート

```js
.pragma library
.import "../issue.js" as IssueModule

var checker = {
  id: "xxx-check",              // kebab-case、Registry キー（他と重複禁止）
  name: "〇〇チェック",
  description: "〇〇が〇〇になっていることを確認する",
  category: "notation",         // articulation / dynamics / tempo / notation
  severity: "warning",          // error / warning / info
  defaultEnabled: true,

  run: function(ir) {
    var issues = [];
    // ir.index.byKind / byStaffAndKind / byTick を使う（ir.events の全件ループは避ける）
    var targets = ir.index.byKind["TARGET_KIND"] || [];
    for (var i = 0; i < targets.length; i++) {
      var ev = targets[i];
      // 違反条件のチェック
      issues.push(IssueModule.createIssue(checker, {
        message: "〇〇が不足しています",
        partName: ev.staffIdx >= 0 ? ir.meta.parts[ev.staffIdx].partName : "",
        staffIdx: ev.staffIdx,
        measure: ev.measure,
        tick: ev.tick,
        detail: null
      }));
    }
    return issues;
  }
};
```

### on/off ペア型のテンプレート

```js
.pragma library
.import "./base/textPairChecker.js" as TextPair

var checker = TextPair.createTextPairChecker({
  id: "xxx-on-off",
  name: "〇〇 on/off チェック",
  description: "〇〇の開始と終了が対応していることを確認する",
  category: "articulation",
  severity: "warning",
  defaultEnabled: true,
  onPattern: /^pizz\.$/i,
  offPattern: /^arco$/i,
  onLabel: "pizz.",
  offLabel: "arco"
});
```

## ステップ 2: index.js への登録（唯一の同期点）

`src/checkers/index.js` に 2 行追加する。

```js
// 既存の import の後に追加
.import "xxxChecker.js" as XxxChecker

// 既存の Registry.register の後に追加
Registry.register(XxxChecker.checker);
```

**QML（ScoreLinter.qml / qml/）と Settings の永続化キーは一切触らない。** 設定 UI は `Linter.getCheckerList()` から自動生成される。

## ステップ 3: テストの追加

`test/runner.js` にテストケースを追加する。

```js
// --- xxxChecker ---
(function() {
  var XxxChecker = load("src/checkers/xxxChecker.js");

  // 正例: 違反なし
  var ir1 = irBuilder.buildIR({
    events: [ /* 正常なケース */ ],
    parts: [{ staffIdx: 0, partName: "Violin I" }]
  });
  assert.strictEqual(XxxChecker.checker.run(ir1).length, 0, "違反なし");

  // 負例: 違反あり
  var ir2 = irBuilder.buildIR({
    events: [ /* 違反するケース */ ],
    parts: [{ staffIdx: 0, partName: "Violin I" }]
  });
  var issues = XxxChecker.checker.run(ir2);
  assert.strictEqual(issues.length, 1, "違反1件");
  assert.strictEqual(issues[0].ruleId, "xxx-check");

  console.log("✓ xxxChecker");
})();
```

## ステップ 4: README の更新

`README.md` の「チェック項目」表に 1 行追加する。

```markdown
| 〇〇チェック | `xxx-check` | notation | warning | ✅ |
```

## チェックリスト

- [ ] `id` が kebab-case で他と重複していない
- [ ] `run()` 内で `try/catch` を書いていない（linter が全体で catch する）
- [ ] `ir.events` の全件ループではなく `ir.index` を使っている
- [ ] `src/checkers/index.js` に登録した
- [ ] 正例・負例の両方のテストを追加した
- [ ] README の「チェック項目」表を更新した
