---
description: throw / never-catch 規約。ルールの run() は例外を throw させてよい
paths:
  - "packages/**/src/**"
  - "apps/**/src/**"
---

# エラー処理の規約

## ルール内での例外処理

**ルールの `run` の中で `try/catch` を書いてはいけない。**

`createLinter` の `lint` が各ルールの実行を wrap して catch する。ルールが例外を throw しても
他のルールは走り続け、`ruleId: "internal"`・severity `error` の指摘として「このルールが失敗した」と返る。
例外を投げたルールがそれまでに `report` した指摘は残らない。個別に catch して握りつぶすと、バグが静かに隠れる。

```ts
// ❌ 違反: バグが隠れる
run({ score, report }) {
  try {
    doCheck(score, report);
  } catch {
    return;
  }
}

// ✅ 正しい: 例外はエンジンが catch する
run({ score, report }) {
  doCheck(score, report);
}
```

## 一般的な throw / Result の使い分け

| 状況                                         | パターン                                       |
| -------------------------------------------- | ---------------------------------------------- |
| 人が打った値の検証（CLI の引数・設定の文字列） | `{ ok: false, error }` の結果型（`parseOptionText`） |
| 保存値の読み込み（壊れていても続けたい）      | 捨てて既定値に戻す（`resolveOptions`・`parseSettings`）。投げない |
| 本当に例外的 / 想定外                        | 生 `throw new Error(...)`                      |

## やってはいけないこと

- `catch (err) { return []; }` や `catch { return defaultValue }` でエラーを握りつぶす
- 1 関数の中で throw と Result を併用する
