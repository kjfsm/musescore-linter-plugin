---
"musescore-linter-plugin": minor
---

LintIR を音高・タイ・リピート種別へ拡張し、SDK 拡張を前提とする 3 チェッカーを追加しました。
段階プランは `docs/sdk-extension-plan.md` を参照。

- `LintEvent.notes`（和音の各音符: 音高/tpc/譜表位置/臨時記号表示）と `IRMeta.ties`（タイ両端の音高つき）を IR に追加。
- 小節線種別を `repeat_start` / `repeat_end` / `repeat_both` に細分（SDK helpers の `classifyBarlineKind` に追従）。
- TPC 演算ヘルパ `tpcToStep` / `tpcToAlter` / `tpcToName` を core に追加。
- 新チェッカー **リピート小節線の対応**（`repeat-barline-match`・notation・warning）— リピート開始に対応する終了が無い箇所を検出（終了単独は曲頭反復として許容）。
- 新チェッカー **異音程のタイ**（`tie-pitch-mismatch`・notation・warning）— 異なる音高をタイで結んでいる箇所を検出。
- 新チェッカー **親切臨時記号の提案**（`courtesy-accidental`・notation・info）— 前小節で臨時記号が付いた音が次小節で記号なしで再び現れる箇所に親切記号を提案。

> snapshot（実スコア走査）からの音高・タイ抽出の配線は、SDK helpers の新バージョン公開後に行う（`docs/sdk-extension-plan.md` の残作業）。それまで 3 チェッカーはテスト fixture でのみ検証済みで、実スコアでは発火しない。
