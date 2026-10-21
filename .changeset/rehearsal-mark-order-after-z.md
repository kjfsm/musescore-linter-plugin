---
"@score-linter/plugin": patch
"@score-linter/cli": patch
"@score-linter/web": patch
---

「リハーサルマークの順序」チェックが、AZ の後に BA, BB… と続く譜面で順序の逆転を誤検出していたのを直しました。Z の後を AA, AB, AC… と続ける譜面でも、AA, BB, CC… と続ける譜面でも、正しい順序なら指摘しません。
