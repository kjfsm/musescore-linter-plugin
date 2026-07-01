---
"@musescore-linter/core": minor
"@musescore-linter/checkers": patch
---

`buildSnapshot` の呼び出し契約バグを修正し、SDK の版安全ヘルパを活用するようにした。

**重大バグ修正（`@musescore-linter/core`）**: `ScoreLinter.qml` が `buildSnapshot(curScore, NoteType, BarLineType)` と
3 引数フラットで呼んでいたが、実際のシグネチャは `(score, hostEnums)` の 2 引数だった。結果 `hostEnums` に
`NoteType` オブジェクト自体が渡り、`hostEnums.noteType` / `hostEnums.barLineType` が `undefined` になっていた。
`isGraceNote(chord, undefined)` が各小節の解析で例外を投げ、`buildSnapshot` 内の per-measure `try/catch` が
握りつぶすため、**スナップショットが実質空になり全 checker が何も検出しない**状態になっていた
（`#90` で混入・リリース済み）。QML 側の呼び出しを `buildSnapshot(curScore, { noteType, barLineType }, plugin)`
に修正。

**SDK の版安全ヘルパを活用**:
- `buildSnapshot` に第 3 引数 `host?: MuseScore` を追加。渡すと SDK の `checkHostVersion` で型の生成元
  MuseScore バージョンと実行版を照合し、結果を `ir.meta.hostVersion`（`{ ok, generatedTag, running, message? }`）
  に記録する。不一致時は QML 側が警告 issue として結果リストに出す。
- `hostEnums`（`NoteType`/`BarLineType`）を SDK の `strictEnum` で包み、実行中の版に存在しないメンバへの
  アクセスを「静かな undefined」ではなく例外にする（Proxy 非対応環境ではフォールバック）。

**内部重複の解消（`@musescore-linter/checkers`）**: 4 checker に重複していた `measureAtTick` と、6 checker に
重複していた part 名マップ構築を `packages/checkers/src/base/query.ts` の `measureAtTick` / `buildPartNameMap`
に一本化。挙動は不変。
