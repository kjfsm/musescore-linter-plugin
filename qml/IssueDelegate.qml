import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root

    property var issue: null
    property bool alternate: false
    property bool canJump: !!issue && issue.ruleId !== "" && issue.ruleId !== "internal"

    readonly property var palette_: {
        "error":   { indicator: "#e53935", text: "#c62828" },
        "warning": { indicator: "#fb8c00", text: "#ef6c00" },
        "info":    { indicator: "#43a047", text: "#2e7d32" }
    }
    readonly property var pal: issue ? (palette_[issue.severity] || palette_.info) : palette_.info

    signal jumpRequested(var issue)

    width: parent ? parent.width : 0
    height: content.implicitHeight + 14
    color: mouseArea.containsMouse ? "#eef3f8" : (alternate ? "#f8f8f8" : "#ffffff")
    border.color: "#e4e4e4"
    border.width: 1
    radius: 3

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: canJump ? Qt.PointingHandCursor : Qt.ArrowCursor
        onClicked: if (canJump) root.jumpRequested(issue)
    }

    RowLayout {
        id: content
        anchors.fill: parent
        anchors.margins: 8
        spacing: 10

        Rectangle {
            width: 10; height: 10; radius: 5
            color: pal.indicator
            Layout.alignment: Qt.AlignTop
            Layout.topMargin: 4
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 3

            RowLayout {
                spacing: 6
                Layout.fillWidth: true

                Label {
                    text: (issue ? issue.severity : "").toUpperCase()
                    color: pal.text
                    font.bold: true
                    font.pixelSize: 10
                }
                Label {
                    visible: !!issue && !!issue.ruleId && issue.ruleId !== "internal"
                    text: issue ? issue.ruleId : ""
                    color: "#888888"
                    font.pixelSize: 10
                }
                Item { Layout.fillWidth: true }
                Label {
                    visible: !!issue && issue.measure > 0
                    text: issue ? ("小節 " + issue.measure) : ""
                    color: "#888888"
                    font.pixelSize: 10
                }
            }

            Label {
                text: issue ? (issue.message || "") : ""
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
                font.pixelSize: 13
            }
        }
    }
}
