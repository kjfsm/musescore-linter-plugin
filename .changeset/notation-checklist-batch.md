---
"musescore-linter-plugin": minor
---

楽譜浄書チェック項目を拡充し、弦楽器以外（金管・鍵盤・ハープ）へ範囲を広げました。あわせて今後追加しうる項目の網羅カタログ `docs/notation-checklist.md`（実装可否・優先度・必要な SDK 拡張つき）を追加しています。

新チェッカー（7 種）:

- **Mute / Open**（`mute-open`・articulation・warning）— 金管のミュート指定（`mute`/`straight mute`/`cup mute`/`harmon`/`stopped` 等）→ `open` 復帰の対応漏れ・重複。
- **Una corda / Tre corde**（`una-corda`・articulation・warning）— ピアノ左ペダルの対応漏れ・重複。
- **Près de la table / Ord.**（`harp-table`・articulation・warning）— ハープの響板寄り奏法 → `ordinario` 復帰の対応漏れ・重複。
- **テンポ変化の解除漏れ**（`tempo-change-resolution`・tempo・warning）— `rit.`/`accel.` 等が `a tempo` や後続の新テンポ表記で解除されないまま終わる箇所。曲尾の最終的な rit.（最後の音楽小節）は誤検出しない。
- **同時ダイナミクスの衝突**（`simultaneous-dynamics`・dynamics・warning）— 同じ位置に異なる強弱記号が同時に付与されている矛盾。
- **ヘアピンの到達先ダイナミクス**（`hairpin-target-dynamic`・dynamics・info）— crescendo/diminuendo の終端に到達先のダイナミクスが無い箇所。曲尾まで伸びるヘアピン（dim. al niente 等）は除外。
- **リハーサルマークの順序**（`rehearsal-mark-order`・notation・info）— リハーサルマークの順序逆転・重複。

いずれも現行 LintIR のみで実装。音高・拍子・楽器種別などが必要な項目はカタログに `要 SDK 拡張` として記録し、別途段階的に対応します。
