---
"musescore-linter-plugin": minor
---

新チェッカー **「同リズム間のスラー/アーティキュレーション整合」**（`articulation-slur-consistency`・articulation・info）を追加しました。

同じ小節で**同じリズム**のパート間で、スラーの有無やアーティキュレーション（スタッカート等）が食い違っている箇所を検出します。声部横断の見落としに気づくための補助で、最終判断は編曲方針に委ねるため severity は info。

- LintIR Tier 1 の `rhythmByStaffMeasure` / `articulationsByChordId` / `slursByStaff` を利用。
- クエリ層 `base/query.ts`（`chordsIn` / `articulationsOf` / `slurCoversTick` / `staffGroupsSharingRhythm` 等）を追加。
- 比較は主声部（voice 0）・小節単位。音高での「ユニゾン限定」は将来（pitch データが必要）。
