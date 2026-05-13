---
"musescore-linter-plugin": patch
---

チェッカー判定条件の修正

- **restAnnotationChecker**: 休符上の演奏技法テキスト（pizz./arco/con sord. 等）も不受理として検出するよう拡張。これまで DYNAMIC（強弱記号）のみを検出していたが、description に記載のとおり STAFF_TEXT 内の技法指示も対象に加えた。
- **codaSegnoChecker**: "D.C./D.S. al Fine" がある場合に Fine マークの存在を確認するチェックを追加。description に記載されていた Fine 対応が未実装だった。
- **openingTempoChecker**: 手動の CHORD/REST 全走査を `ir.meta.firstMusicTickByStaff` の参照に置き換えて簡素化。
