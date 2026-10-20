import QtQuick 2.15
import MuseScore 3.0

import "logic.js" as Logic

MuseScore {
  menuPath: "Plugins.Goto Measure 8"
  title: "Goto Measure 8"
  version: "0.1.0"
  description: "8 小節目（Measure.no === 7）にジャンプする最小デモ。"
  pluginType: "dialog"
  requiresScore: true

  onRun: {
    Logic.run(curScore)
    Qt.quit()
  }
}
