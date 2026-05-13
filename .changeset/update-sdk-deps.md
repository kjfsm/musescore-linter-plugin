---
"@musescore-linter/core": patch
---

`@kjfsm/musescore-plugin-sdk-helpers` を v0.1.0 → v1.0.1、`@kjfsm/musescore-plugin-sdk-types` を v0.0.2 → v0.1.0 にアップデート。

SDK の型安全なヘルパー関数（`isChord`、`isRest`、`isBarLine`、`isTempo` 等）を利用するようリファクタリングし、QML 側から enum マップを渡す必要がなくなった。`buildSnapshot` の引数から `MuseScoreEnums` を削除。
