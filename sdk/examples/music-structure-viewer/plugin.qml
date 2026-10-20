import QtQuick 2.15
import QtQuick.Controls 2.15
import MuseScore 3.0

import "logic.js" as Logic

MuseScore {
  menuPath: "Plugins.Music Structure Viewer"
  title: "Music Structure Viewer"
  version: "0.1.0"
  description: "楽譜の構造を JSON 形式でスキャンして表示する。選択・コピーが可能。"
  pluginType: "dialog"
  requiresScore: true
  width: 760
  height: 580

  property string structureJson: ""

  onRun: {
    // `NoteType` / `BarLineType` は MuseScore オブジェクトのプロパティ（実行時に値を解決する enum）。
    // 値を焼き込まず、実行時の enum を引数で渡す。
    structureJson = Logic.buildStructure(curScore, NoteType, BarLineType)
  }

  Item {
    anchors.fill: parent

    Text {
      id: titleLabel
      anchors {
        top: parent.top
        left: parent.left
        right: parent.right
        topMargin: 10
        leftMargin: 14
      }
      text: "Music Structure Viewer"
      font.pixelSize: 14
      font.bold: true
    }

    Text {
      id: hintLabel
      anchors {
        top: titleLabel.bottom
        left: parent.left
        right: parent.right
        topMargin: 2
        leftMargin: 14
      }
      text: "クリックして選択 / Ctrl+A で全選択 / Ctrl+C でコピー"
      font.pixelSize: 11
      opacity: 0.6
    }

    ScrollView {
      id: scrollView
      anchors {
        top: hintLabel.bottom
        left: parent.left
        right: parent.right
        bottom: buttonRow.top
        topMargin: 6
        leftMargin: 12
        rightMargin: 12
        bottomMargin: 8
      }
      clip: true

      TextArea {
        id: textArea
        text: structureJson
        readOnly: true
        selectByMouse: true
        font.family: "Courier New"
        font.pixelSize: 11
        wrapMode: Text.NoWrap
      }
    }

    Row {
      id: buttonRow
      anchors {
        right: parent.right
        bottom: parent.bottom
        rightMargin: 12
        bottomMargin: 10
      }
      spacing: 8

      Button {
        id: copyBtn
        text: "全体をコピー"
        onClicked: {
          textArea.selectAll()
          textArea.copy()
          textArea.deselect()
          copyBtn.text = "コピーしました"
          copyTimer.restart()
        }

        Timer {
          id: copyTimer
          interval: 1500
          onTriggered: copyBtn.text = "全体をコピー"
        }
      }

      Button {
        text: "閉じる"
        onClicked: Qt.quit()
      }
    }
  }
}
