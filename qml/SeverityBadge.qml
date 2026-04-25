import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root

    property string severity: "info"
    property int count: 0
    property bool active: true

    readonly property var palette_: {
        "error":   { bg: "#FFEBEE", fg: "#C62828", dot: "#E53935", inactiveBg: "#F5F5F5", inactiveFg: "#9E9E9E" },
        "warning": { bg: "#FFF8E1", fg: "#E65100", dot: "#FB8C00", inactiveBg: "#F5F5F5", inactiveFg: "#9E9E9E" },
        "info":    { bg: "#E3F2FD", fg: "#1565C0", dot: "#1E88E5", inactiveBg: "#F5F5F5", inactiveFg: "#9E9E9E" }
    }
    readonly property var pal: palette_[severity] || palette_.info

    implicitHeight: 26
    implicitWidth: row.implicitWidth + 16
    radius: 13
    color: (active && count > 0) ? pal.bg : pal.inactiveBg
    border.color: (active && count > 0) ? pal.dot : "#E0E0E0"
    border.width: 1
    opacity: count === 0 ? 0.5 : 1.0

    Behavior on color { ColorAnimation { duration: 100 } }
    Behavior on opacity { NumberAnimation { duration: 100 } }

    signal clicked()

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: root.clicked()
    }

    RowLayout {
        id: row
        anchors.centerIn: parent
        spacing: 5

        Rectangle {
            width: 7; height: 7; radius: 4
            color: (active && count > 0) ? pal.dot : pal.inactiveFg
        }
        Label {
            text: {
                if (severity === "error")   return "ERROR";
                if (severity === "warning") return "WARN";
                return "INFO";
            }
            color: (active && count > 0) ? pal.fg : pal.inactiveFg
            font.bold: true
            font.pixelSize: 10
            font.letterSpacing: 0.5
        }
        Rectangle {
            visible: count > 0
            implicitWidth: Math.max(18, countLabel.implicitWidth + 8)
            implicitHeight: 16
            radius: 8
            color: (active && count > 0) ? pal.dot : pal.inactiveFg
            Label {
                id: countLabel
                anchors.centerIn: parent
                text: count > 99 ? "99+" : count
                color: "white"
                font.bold: true
                font.pixelSize: 10
            }
        }
    }
}
