---
"@musescore-linter/checkers": minor
"@musescore-linter/core": minor
---

`articulation-slur-consistency` チェッカーを `slur-tie-articulation-consistency` にリネームし、タイの被覆比較を追加。

- ルール名を「同リズム間のスラー/アーティキュレーション整合」→「同リズム間のスラー/タイ/アーティキュレーション整合」に変更。id も `articulation-slur-consistency` → `slur-tie-articulation-consistency` に変更
- 同じリズムのパート間でタイの有無が食い違う場合も検出するようになった（`IRDerived.tiesByStaff` / `tieCoversTick` を追加）
- MuseScore の `subtypeName()` が符尾方向で返す「上スタッカート」「下スタッカート」等の配置違いバリアントを同一視するよう正規化（`normalizeArticulationName`）し、誤検出を修正
- `rhythmByStaffMeasure` の署名に event kind（chord/rest）を含めるよう修正し、休符と音符を「同じリズム」と誤認していたバグを修正
