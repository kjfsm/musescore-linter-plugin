---
"musescore-linter-plugin": patch
---

MuseScore プラグインで、「重複ダイナミクス」チェックが「f」の後の「più f」や「p」の後の「subito p」を重複として誤検出していたのを直しました。強弱記号を含まない別々の文字（「poco a poco」と「molto」など）を重複扱いすることもなくなります。
