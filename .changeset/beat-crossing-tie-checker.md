---
"@musescore-linter/core": minor
"@musescore-linter/checkers": minor
---

拍境界をまたぐ音符を検出する Checker を追加:

- **beat-crossing-tie**（info / 主要境界またぎは warning）: 裏拍から始まった音符が拍境界をまたぐ記譜（イマジナリーバーライン違反）を検出し、タイでの分割案をメッセージに載せる。例: 4/4 の「付点8分+付点8分+8分」の 2 つ目 → 「16分音符+8分音符のタイ」。4/4 の 3 拍目頭のような主要境界をまたぐ場合だけ warning に上げる。単純拍子（2/4・3/4・4/4）と複合拍子（6/8・9/8・12/8）のみを対象とし、加算拍子・アウフタクト・連符は判定対象外として黙ってスキップする。

前提として LintIR に小節の枠組みを追加:

- `meta.measures[]`（`MeasureInfo` = 小節番号 / 先頭 tick / 小節長 / 拍子 n・m）を新設。MuseScore 経路は helpers の `getMeasureTimeSig`、MusicXML 経路は `<attributes><time>` から配線した（`<time>` は次の変更まで持ち回る）。拍子が取れない小節は配列に載らないので、参照側は「無ければ判定しない」で済む。
- tick 分解能定数 `TICKS_PER_QUARTER` / `TICKS_PER_WHOLE` を core へ移設。`@musescore-linter/source-musicxml` の `TICKS_PER_QUARTER` は core からの再輸出になり、値・公開 API とも変更なし。
