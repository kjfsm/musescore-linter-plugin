import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root

    property var issue: null
    property bool alternate: false

    signal clicked()

    readonly property var palette_: {
        "error":   { border: "#EF5350", bgHover: "#FFEBEE", tag: "#FFCDD2", tagText: "#C62828" },
        "warning": { border: "#FFA726", bgHover: "#FFF8E1", tag: "#FFE0B2", tagText: "#E65100" },
        "info":    { border: "#42A5F5", bgHover: "#E3F2FD", tag: "#BBDEFB", tagText: "#1565C0" }
    }
    readonly property var pal: issue ? (palette_[issue.severity] || palette_.info) : palette_.info

    width: parent ? parent.width : 0
    height: layout.implicitHeight + 16
    color: mouseArea.containsMouse ? pal.bgHover : (alternate ? "#FAFAFA" : "#FFFFFF")
    radius: 4

    Behavior on color { ColorAnimation { duration: 80 } }

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: root.clicked()
    }

    // 左ボーダー（severity カラー）
    Rectangle {
        width: 3
        height: parent.height
        radius: 2
        color: pal.border
        anchors.left: parent.left
    }

    ColumnLayout {
        id: layout
        anchors {
            left: parent.left
            right: parent.right
            top: parent.top
            leftMargin: 12
            rightMargin: 12
            topMargin: 8
        }
        spacing: 4

        // 上段: パート名 + 小節番号
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            // パート名タグ
            Rectangle {
                visible: !!issue && issue.partName && issue.partName.length > 0
                implicitWidth: partLabel.implicitWidth + 10
                implicitHeight: 20
                radius: 3
                color: pal.tag
                Label {
                    id: partLabel
                    anchors.centerIn: parent
                    text: issue ? issue.partName : ""
                    color: pal.tagText
                    font.bold: true
                    font.pixelSize: 12
                }
            }

            // 小節番号
            Label {
                visible: !!issue && issue.measure > 0
                text: issue ? ("小節 " + issue.measure) : ""
                color: "#616161"
                font.pixelSize: 12
                font.bold: true
            }

            Item { Layout.fillWidth: true }

            // ルール ID（右端・薄く）
            Label {
                visible: !!issue && !!issue.ruleId && issue.ruleId !== "internal"
                text: issue ? issue.ruleId : ""
                color: "#BDBDBD"
                font.pixelSize: 10
                font.italic: true
            }
        }

        // 下段: メッセージ本文
        Label {
            text: issue ? (issue.message || "") : ""
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
            font.pixelSize: 12
            color: "#212121"
            bottomPadding: 2
        }
    }
}
