import QtQuick 2.15
import MuseScore 3.0

import "logic.js" as Logic

MuseScore {
  menuPath: "Plugins.List TODOs"
  title: "List TODOs"
  version: "0.1.0"
  description: "スコア内のテキスト要素から TODO/FIXME を含むものを抽出してログに出力する。"
  pluginType: "dialog"
  requiresScore: true

  onRun: {
    Logic.run(curScore)
    Qt.quit()
  }
}
