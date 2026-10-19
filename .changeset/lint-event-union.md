---
"musescore-linter-plugin": patch
---

MuseScore プラグインのスナップショットタブと CLI の `--dump-ir` が出力する内部データの形式を整理しました。`registry` と各イベントの `type` がなくなり、イベントの種類は `kind` だけで表します。テキスト以外のイベント（音符・休符・小節線）には `textNorm` / `textRaw` / `tempo` が出なくなりました。スナップショットタブには `derived` も出なくなります。チェック結果は変わりません。
