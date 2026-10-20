# @kjfsm/musescore-plugin-sdk-types

MuseScore 4 Plugin API の TypeScript 型定義。

`src/generated/` 以下のファイルは `@kjfsm/musescore-plugin-sdk-types-generator` が公式の `musescore/MuseScore` C++ ヘッダから生成したもの。手で編集せず、リポジトリのルートで `pnpm generate:types` を実行すること。

## 使い方

```ts
import type { MuseScore, Score, Cursor, Note } from "@kjfsm/musescore-plugin-sdk-types";

// `MuseScore` は QML の `MuseScore { }` オブジェクト（ホスト）の型。
// curScore・全 enum・メソッド・mscoreMajorVersion 等を 1 つにまとめている。
export function run(host: MuseScore): void {
  const score = host.curScore;
  if (!score) return;
  if (/* el */ null === host.Element.NOTE) {
    // host.Element の値は実行時に解決される
  }
}
```

## 実行時 enum とホスト型

apiv1 の `element.type` は実行時に C++ enum の生の整数を返す。この値は MuseScore のバージョン差で並び替わりうる（例: 4.7.2→4.7.3 で `ElementType` が再採番）。そのため生成 enum（`enums.ts`）は**値を持たない型のみ**として出力される — `ElementType.NOTE` のように値として使おうとすると、そもそもコンパイルが通らない。

比較には**実行時のホスト enum**（`host.Element` など）を使う。型側はキー（メンバ名）だけを生成 enum の `<Enum>Name` から取り、値はブランド化された生成 enum の型（実行時に解決される）になる:

- `MuseScore` — ホスト型（`qmlpluginapi.h` から自動生成。enum プロパティは `RuntimeEnum<Name, Value>` 型）。
- `RuntimeEnum<Name, Value>` / `ElementEnum` / `NoteTypeEnum` / `BarLineTypeEnum` / `BracketTypeEnum` — 実行時 enum オブジェクトの型。
- `ElementTypeName` / `NoteTypeName` / `BarLineTypeName` / `BracketTypeName` — enum メンバ名のユニオン。
- `generatedFrom` — 型を生成した MuseScore バージョン（`{ repository, tag, commitSha }`）。バージョン照合に使える。

生成 enum の値はブランド化されている（例: `ElementType` と `NoteType` は互いに代入不可）ため、`el.type === host.NoteType.NORMAL` のような enum の取り違えも型エラーで検出できる。

エントリ定義・バージョン照合のヘルパ（`definePlugin` / `assertHostVersion` 等）は `@kjfsm/musescore-plugin-sdk-helpers` にある。

## globals

`@kjfsm/musescore-plugin-sdk-types/globals` は `curScore` と `Qt` をアンビエントグローバルとして宣言する。ただし推奨はホスト経由（`host.curScore` / `host.quit()`）。
