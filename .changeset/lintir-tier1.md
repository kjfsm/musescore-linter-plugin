---
"musescore-linter-plugin": minor
---

LintIR を Tier 1 に拡張し、これまで捨てていた記譜データを取り込むようにしました（声部横断・記譜整合系チェッカーの土台）。

- chord イベントに `stemDirection` / `beamMode` / `articulations`（アーティキュレーション名）を付与。
- スラーを `meta.slurs`（`{ staffIdx, voice, startTick, endTick }`）として収集（ヘアピンと同様）。
- `ensureDerived` に関係を追加：`articulationsByChordId`、`slursByStaff`、`rhythmByStaffMeasure`（`${staffIdx}:${measure}:${voice}` → リズム署名。声部横断の同リズム判定キー）。
- SDK helpers を `^2.1.0` に更新（`isSlur` / `getSpannerRange` / `getArticulationNames` を使用）。

チェッカーの挙動・UI に変更はありません（既存の取り込みは不変＝加算的）。これらのデータを使う新チェッカーは別途追加します。
