---
"@musescore-linter/checkers": minor
---

新規 Checker を3つ追加（現行 LintIR のみで実装、SDK 拡張不要）:

- **spanner-on-rest**（warning）: ヘアピン(cresc./dim.)やスラーの端点が休符上にある箇所を検出。同 tick に音符があれば許容。
- **slur-single-note**（info）: スラーが単一音（開始 tick == 終了 tick）に掛かっている箇所を検出。
- **cresc-text-resolution**（info）: テキスト式 cresc./dim. の後に到達先の強弱記号が現れない箇所を検出。
