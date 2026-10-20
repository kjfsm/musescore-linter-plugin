import QtQuick 2.15
import MuseScore 3.0

import "logic.js" as Logic

MuseScore {
  menuPath: "Plugins.Color Selected"
  title: "Color Selected"
  version: "0.1.0"
  description: "選択中の音符（または範囲選択がなければスコア全体）を赤く着色する。"
  pluginType: "dialog"
  requiresScore: true

  onRun: {
    Logic.run(curScore)
    Qt.quit()
  }
}
