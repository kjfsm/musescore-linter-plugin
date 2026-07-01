---
"@musescore-linter/core": patch
---

SDK の enum が「値を持たない型のみ」になる破壊的変更（`@kjfsm/musescore-plugin-sdk-types@2.0.0` / `@kjfsm/musescore-plugin-sdk-helpers@4.0.0`）に追従。`snapshot.ts` にあったローカル回避実装 `classifyBarlineKindRuntime`（SDK 側の焼き込み比較を避けるための重複実装）を削除し、SDK が実行時 enum 対応に更新された `classifyBarlineKind` を直接呼ぶように変更。挙動・出力は不変。
