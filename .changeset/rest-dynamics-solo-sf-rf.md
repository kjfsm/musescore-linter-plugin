---
"musescore-linter-plugin": patch
---

強弱記号・ヘアピン・solo/tutti 周りの severity を実運用に合わせて調整した。

- `休符アノテーション`: 休符へのダイナミクスは info に緩和した（演奏技法テキストは従来通り error）
- `休符上のスパナー端点`（`spanner-on-rest`）を `休符上のヘアピン端点`（`hairpin-on-rest`, severity: info）と `休符上のスラー端点`（`slur-on-rest`, severity: warning）に分割した。ヘアピンの端点（開始・終了とも）が休符上にあるケースは info、スラーは従来通り warning
- `Solo / Tutti`: `tutti` を挟まずに `solo`/`soli` が連続する「二連ソロ」は info に緩和した（tutti 側の重複・戻し忘れは従来通り warning）
- `重複ダイナミクス`: `sf`/`rf` が連続する場合は重複として検出しないようにした（アクセントとして連続使用されるため）
