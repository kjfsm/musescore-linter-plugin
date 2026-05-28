---
description: throw / never-catch 規約。Checker の run() は例外を throw させてよい
paths:
  - "packages/**/src/**"
  - "src/**"
---

# エラー処理の規約

## Checker 内での例外処理

**Checker の `run(ir)` 関数内で `try/catch` を書いてはいけない。**

`linter.runAllCheckers` がすべての checker を wrap して catch する。checker が例外を throw しても他の checker は走り続け、ユーザーには「この checker が失敗した」という情報が返る。個別 catch で握りつぶすと、バグが静かに隠れる。

```js
// ❌ 違反: バグが隠れる
run(ir) {
  try {
    return doCheck(ir);
  } catch (e) {
    return [];
  }
}

// ✅ 正しい: 例外は linter が catch する
run(ir) {
  return doCheck(ir);
}
```

## 一般的な throw / Result の使い分け

| 状況 | パターン |
|------|---------|
| 予測される失敗（バリデーション等） | `{ ok: false, error: { kind, ... } }` Result 型 |
| 本当に例外的 / 想定外 | 生 `throw new Error(...)` |

## やってはいけないこと

- `catch (err) { return []; }` や `catch { return defaultValue }` でエラーを握りつぶす
- 1 関数の中で throw と Result を併用する
