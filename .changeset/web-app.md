---
"musescore-linter-plugin": minor
---

ブラウザ完結の Web 版（`apps/web`）を追加。MusicXML / .mxl をドラッグ&ドロップすると
その場で 29 個の checker が走る。Cloudflare Workers の static assets として配信し、
Worker スクリプトを持たないためファイルがサーバーに送られることはない。
