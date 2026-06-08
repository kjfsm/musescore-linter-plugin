---
"musescore-linter-plugin": minor
---

プラグイン UI から **アップデート確認**ができるようになりました。

- ヘッダーの「アップデート確認」ボタンで GitHub Releases から最新版を取得し、現在版と比較します。
- 新しいバージョンがある場合はバナーで通知し、「ZIP をダウンロード」「プラグインフォルダを開く」ボタンでブラウザ／ファイルマネージャをワンクリックで起動します（展開して中身を置き換え → MuseScore 再起動で更新）。
- バージョンの単一情報源を `package.json` に統一し、ビルド時に QML へ注入するようにしました（従来 `ScoreLinter.qml` 側に古い `version: "2.0"` がハードコードされ実際の版と乖離していた問題を解消）。
- バージョン比較ロジックは `@musescore-linter/core` の `compareVersions` / `isNewerVersion` に切り出し、vitest でテストしています。
