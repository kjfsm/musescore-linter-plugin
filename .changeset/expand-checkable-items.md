---
"musescore-linter-plugin": minor
---

新しいチェッカー 3 件を追加し、型情報の活用基盤を強化

- **BPM 値なしテンポ** (`tempo-without-bpm`, warning): テンポ表記に BPM 値が未設定のものを検出。`LintEvent.tempo` 値を直接参照することで精度を確保。
- **重複ダイナミクス** (`duplicate-dynamics`, info): 同パートで同じ強弱記号が変化なく連続する箇所を検出。`LintEvent.subtype` を優先比較し、textNorm をフォールバックとして使用。
- **終止線の確認** (`final-barline`, info): 曲末の最終 barline が終止線（final barline）になっているかを確認。

あわせて `barlineKind` に `FINAL` を追加（MuseScore 4 の `BarLineType.END` に対応、生値 32 によるフォールバック付き）。
