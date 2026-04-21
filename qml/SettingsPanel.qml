import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ScrollView {
    id: root
    clip: true

    property var checkers: []
    property var enabledRules: ({})

    signal ruleToggled(string ruleId, bool checked)

    ColumnLayout {
        width: root.width
        spacing: 4

        Label {
            text: "チェック項目"
            font.pixelSize: 14
            font.bold: true
            Layout.bottomMargin: 6
        }

        Label {
            text: "無効化したい項目のチェックを外してください。設定は自動保存されます。"
            color: "#777777"
            font.pixelSize: 11
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            Layout.bottomMargin: 8
        }

        Repeater {
            model: root.checkers

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 1

                CheckBox {
                    id: cb
                    text: modelData.name + " [" + modelData.severity.toUpperCase() + "]"
                    checked: root.enabledRules[modelData.id] !== false
                    Layout.fillWidth: true
                    onToggled: root.ruleToggled(modelData.id, checked)
                }

                Label {
                    text: modelData.description || ""
                    visible: text.length > 0
                    Layout.fillWidth: true
                    wrapMode: Text.WordWrap
                    color: "#666666"
                    font.pixelSize: 11
                    leftPadding: 34
                    Layout.bottomMargin: 6
                }
            }
        }
    }
}
