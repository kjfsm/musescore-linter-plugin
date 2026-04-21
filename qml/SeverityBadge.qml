import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root

    property string severity: "info"
    property int count: 0
    property bool active: true
    property bool showCount: true

    readonly property var palette_: {
        "error":   { bg: "#fdecea", fg: "#c62828", dot: "#e53935", dim: "#f8f8f8" },
        "warning": { bg: "#fff4e5", fg: "#ef6c00", dot: "#fb8c00", dim: "#f8f8f8" },
        "info":    { bg: "#e8f5e9", fg: "#2e7d32", dot: "#43a047", dim: "#f8f8f8" }
    }
    readonly property var entry: palette_[severity] || palette_.info

    implicitHeight: 22
    implicitWidth: rowLayout.implicitWidth + 14
    radius: 11
    color: active ? entry.bg : "#f0f0f0"
    border.color: active ? entry.fg : "#cccccc"
    border.width: active ? 1 : 1
    opacity: active ? 1.0 : 0.55

    signal clicked()

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: root.clicked()
    }

    RowLayout {
        id: rowLayout
        anchors.centerIn: parent
        spacing: 6

        Rectangle {
            width: 8; height: 8; radius: 4
            color: active ? entry.dot : "#aaaaaa"
        }
        Label {
            text: severity.toUpperCase()
            color: active ? entry.fg : "#666666"
            font.bold: true
            font.pixelSize: 10
        }
        Label {
            visible: showCount
            text: count
            color: active ? entry.fg : "#666666"
            font.pixelSize: 11
        }
    }
}
