import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root

    property var issue: null
    property bool alternate: false
    property bool canJump: !!issue && issue.ruleId !== "" && issue.ruleId !== "internal"

    readonly property var palette_: {
        "error":   { border: "#EF5350", bgHover: "#FFEBEE", tag: "#FFCDD2", tagText: "#C62828" },
        "warning": { border: "#FFA726", bgHover: "#FFF8E1", tag: "#FFE0B2", tagText: "#E65100" },
        "info":    { border: "#42A5F5", bgHover: "#E3F2FD", tag: "#BBDEFB", tagText: "#1565C0" }
    }
    readonly property var pal: issue ? (palette_[issue.severity] || palette_.info) : palette_.info

    signal jumpRequested(var issue)

    width: parent ? parent.width : 0
    height: layout.implicitHeight + 16
    color: mouseArea.containsMouse ? pal.bgHover : (alternate ? "#FAFAFA" : "#FFFFFF")
    radius: 4

    Behavior on color { ColorAnimation { duration: 80 } }

    // 左ボーダー（severity カラー）
    Rectangle {
        width: 3
        height: parent.height
        radius: 2
        color: pal.border
        anchors.left: parent.left
    }

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: canJump ? Qt.PointingHandCursor : Qt.ArrowCursor
        onClicked: if (canJump) root.jumpRequested(issue)
    }

    RowLayout {
        id: layout
        anchors {
            left: parent.left
            right: parent.right
            top: parent.top
            leftMargin: 12
            rightMargin: 8
            topMargin: 8
        }
        spacing: 8

        // 本文エリア
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            // メタ行: パートタグ + ルールID + 小節番号
            RowLayout {
                spacing: 5
                Layout.fillWidth: true

                // パート名タグ
                Rectangle {
                    visible: !!issue && issue.partName && issue.partName.length > 0
                    implicitWidth: partLabel.implicitWidth + 8
                    implicitHeight: 16
                    radius: 3
                    color: pal.tag
                    Label {
                        id: partLabel
                        anchors.centerIn: parent
                        text: issue ? issue.partName : ""
                        color: pal.tagText
                        font.bold: true
                        font.pixelSize: 10
                    }
                }

                // ルール ID
                Label {
                    visible: !!issue && !!issue.ruleId && issue.ruleId !== "internal"
                    text: issue ? issue.ruleId : ""
                    color: "#9E9E9E"
                    font.pixelSize: 10
                    font.italic: true
                }

                Item { Layout.fillWidth: true }

                // 小節番号（右寄せ）
                Label {
                    visible: !!issue && issue.measure > 0
                    text: issue ? ("m." + issue.measure) : ""
                    color: "#BDBDBD"
                    font.pixelSize: 10
                    font.family: "monospace"
                }
            }

            // メッセージ本文
            Label {
                text: issue ? (issue.message || "") : ""
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
                font.pixelSize: 12
                color: "#212121"
                bottomPadding: 2
            }
        }

        // ジャンプアイコン
        Label {
            visible: canJump && mouseArea.containsMouse
            text: "→"
            color: pal.border
            font.pixelSize: 14
            font.bold: true
            Layout.alignment: Qt.AlignVCenter
        }
    }
}
