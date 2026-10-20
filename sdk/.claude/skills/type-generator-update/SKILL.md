---
name: type-generator-update
description: 新しい MuseScore バージョンに対応して型を更新するときに使う。config.json のタグ変更・再生成・CI ドリフトチェック確認・PR までを案内する。「MuseScore バージョンアップ」「新しい API 型」「型を更新」などのフレーズで起動。
---

# type-generator-update

新しい MuseScore バージョンに対応して `packages/types/src/generated/` を更新する手順。

## ステップ 1: config.json のタグ更新

`packages/types-generator/config.json` の `ref` を新しいバージョンタグに変更する。

```json
{
  "repository": "musescore/MuseScore",
  "ref": "v4.X.Y",  // ← ここを更新
  "headers": [ ... ]
}
```

タグは https://github.com/musescore/MuseScore/tags で確認する。

## ステップ 2: 型の再生成

```bash
# GITHUB_TOKEN を設定しておくと API レート制限（60 req/h）を回避できる
export GITHUB_TOKEN=<token>

pnpm generate:types
```

初回実行時は GitHub からヘッダをダウンロードし `.cache/<ref>/` に保存する。再実行はキャッシュが使われる。

## ステップ 3: 型エラーの確認

```bash
pnpm typecheck
pnpm build
```

新しいバージョンで API が変わっていると型エラーが出ることがある。

### よくある詰まりどころ

- **C++ 型のマッピング失敗**: `map-types.ts` に未知の Qt 型が出ると `unknown` にフォールバックされる。`packages/types-generator/src/map-types.ts` のマッピングテーブルに追加する。
- **クラス名の衝突**: 複数ヘッダに同名クラスが出た場合は `emit.ts` がマージを試みるが、プロパティ衝突があると `Omit<...>` で解消する。
- **手書きファイルとの齟齬**: `src/globals.ts` / `src/manifest.ts` が generated の型に依存している場合は合わせて修正する。
- **ホスト型 `MuseScore` / 実行時 enum**: `config.json` の headers には `qmlpluginapi.h` が含まれ、`PluginAPI` がホスト型 `MuseScore` として生成される。`DECLARE_API_ENUM(QmlName, _, ::Enum)` は `readonly QmlName: RuntimeEnum<EnumName, Enum>` として出力される（対応する enum が生成されていないものはスキップされ、generate 時に警告が出る）。新バージョンで enum が追加され `host.<NewEnum>` を使いたい場合は、その enum を含むヘッダが `enumHeaders` にあるか確認する。

> `host.<Enum>` プロパティが「未生成のためスキップ」警告で出ない場合、その enum 定義ヘッダ（多くは `engraving/dom/*.h` や `engraving/types/types.h`）を `config.json` の `enumHeaders` に追加して再生成する。

## ステップ 4: コミットとPR

```bash
# config.json と generated/ を一緒にコミット
git add packages/types-generator/config.json packages/types/src/generated/
git commit -m "chore: MuseScore v4.X.Y の型を更新"
git push -u origin <branch>
```

CI の `generated-types-drift` ジョブが `pnpm generate:types` を再実行して差分がないことを確認する。

## 注意事項

- **`packages/types/src/generated/` を手書きしない** — PR に手書き変更が混じると CI が落ちる
- タイムスタンプは `_meta.ts` に記録されない（出力は決定論的）
- `examples/` のビルドが通ることも確認する（新 API で破壊的変更がある場合）
