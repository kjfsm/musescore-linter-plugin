import QtQuick 2.15
import MuseScore 3.0

import "logic.js" as Logic

MuseScore {
  menuPath: "Plugins.Score Info"
  title: "Score Info"
  version: "0.1.0"
  description: "メタタグと簡単な統計（小節数・コード数・音符数）をログに出力する。"
  pluginType: "dialog"
  requiresScore: true

  onRun: {
    Logic.run(curScore)
    Qt.quit()
  }
}
