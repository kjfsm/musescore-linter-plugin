---
"musescore-linter-plugin": patch
---

MuseScore 経路で、BPM 値が取れないテンポ表記を `tempo-without-bpm` が検出するようになりました。

これまで内部で `NaN` や `0` が「BPM あり」と判定されてしまい、このチェックは MuseScore 上では事実上発火しませんでした。
