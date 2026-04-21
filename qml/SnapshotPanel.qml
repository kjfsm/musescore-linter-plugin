import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: root
    spacing: 4

    property string snapshotText: ""

    signal copyRequested(string text)

    RowLayout {
        Layout.fillWidth: true

        Label {
            text: "スナップショット（LintIR の JSON）"
            font.pixelSize: 14
            font.bold: true
            Layout.fillWidth: true
        }

        Button {
            text: "コピー"
            enabled: root.snapshotText.length > 0
            onClicked: root.copyRequested(root.snapshotText)
        }
    }

    Label {
        text: "チェッカーをデバッグしたり fixture として保存する際に利用してください。"
        color: "#777777"
        font.pixelSize: 11
        Layout.fillWidth: true
        wrapMode: Text.WordWrap
    }

    ScrollView {
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true

        TextArea {
            id: snapshotArea
            text: root.snapshotText || "「実行」ボタンを押すとスナップショットが表示されます"
            readOnly: true
            selectByMouse: true
            wrapMode: TextArea.Wrap
            font.family: "monospace"
            font.pixelSize: 11
        }
    }
}
