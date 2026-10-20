---
description: throw / Result の使い分けと TypeScript strict 準拠のエラー処理
paths:
  - "packages/**/src/**"
---

# エラー処理の規約

## throw / Result の使い分け

| 状況 | パターン |
|------|---------|
| 予測される失敗（バリデーション・パース失敗等） | `{ ok: false, error: { kind: "<ns>/<kind>", ... } }` Result 型 |
| 本当に例外的 / 想定外 | 生 `throw new Error(...)` |

```ts
// ❌ 違反: 予測される失敗を throw で扱う
function parseConfig(raw: unknown): Config {
  if (!isValid(raw)) throw new Error("invalid");
  return raw as Config;
}

// ✅ Result 型で返す
function parseConfig(raw: unknown): { ok: true; value: Config } | { ok: false; error: { kind: "config/invalid" } } {
  if (!isValid(raw)) return { ok: false, error: { kind: "config/invalid" } };
  return { ok: true, value: raw as Config };
}
```

## やってはいけないこと

- `catch (err) { return undefined }` でエラーを握りつぶす
- 1 関数の中で throw と Result を併用する
- エラーメッセージに機密情報（トークン・パスワード）を含める

## TypeScript strict との関係

`noUncheckedIndexedAccess` が有効なため、インデックスアクセスは `T | undefined` を返す。`if (arr[i] === undefined)` での早期 return か、`!` 非 null アサーションを使わず型ガードで絞り込む。
