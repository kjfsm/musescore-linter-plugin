---
"musescore-linter-plugin": minor
---

パーサーを差し替え可能にし、MusicXML を解析する `musescore-lint` CLI を追加

- MuseScore 依存を `source-musescore` パッケージへ分離し、`core` / `checkers` を MuseScore 非依存にした
- MusicXML / .mxl から LintIR を組み立てる `source-musicxml` を追加（29 個の checker は無改修で動作）
- `musescore-lint` CLI を追加（pretty / json / github 出力、終了コードによる CI 連携）
- `.mscz` を MuseScore CLI で MusicXML 化して解析する GitHub Actions ワークフローを追加

QML プラグインの動作・バンドル出力に変更はない。
