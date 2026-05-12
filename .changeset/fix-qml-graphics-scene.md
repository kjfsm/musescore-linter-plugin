---
"musescore-linter-plugin": patch
---

Qt.labs.settings を QtObject に置き換え、MuseScore 4 での起動エラーを修正

MuseScore 4 の QML 環境では `Qt.labs.settings` モジュールが利用できないため、
プラグインロード時に "module is not installed" エラーが発生していた。
`Settings { }` を `QtObject { }` に変更してインメモリ保持に切り替えることで修正。
セッション間でのルール設定の永続化はなくなるが、プラグインが正常に起動・動作するようになる。
