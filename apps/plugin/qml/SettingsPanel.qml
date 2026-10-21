import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ScrollView {
    id: root
    clip: true

    // [{ category, label, rules }]。並びと、どのルールを入れるかは Bundle 側が決める。
    property var groups: []
    // 試験中（nursery）のルール。話題を問わずここにまとまる。
    property var nursery: []
    property string preset: "recommended"
    property var enabledRules: ({})
    // ruleId → { key: 値 }。既定値で埋めた値が入る。
    property var ruleOptions: ({})
    property bool perfEnabled: false

    signal presetSelected(string preset)
    signal groupToggled(string category, bool enabled)
    signal ruleToggled(string ruleId, bool checked)
    signal ruleOptionChanged(string ruleId, string key, var value)
    signal perfToggled(bool checked)

    function enabledCount(rules) {
        var n = 0;
        for (var i = 0; i < rules.length; i++) {
            if (enabledRules[rules[i].id] === true) n++;
        }
        return n;
    }

    component SectionHeader: RowLayout {
        id: header
        property string label: ""
        property string countText: ""
        property bool expanded: true
        signal clicked()

        Layout.fillWidth: true
        Layout.topMargin: 10
        Layout.bottomMargin: 6
        spacing: 6

        Label {
            text: header.expanded ? "▾" : "▸"
            color: "#9E9E9E"
            font.pixelSize: 11
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: header.clicked()
            }
        }
        Label {
            text: header.label
            font.pixelSize: 12
            font.bold: true
            color: "#616161"
            font.letterSpacing: 0.5
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: header.clicked()
            }
        }
        Label {
            text: header.countText
            color: "#9E9E9E"
            font.pixelSize: 10
        }
        Item { Layout.fillWidth: true }
    }

    component SmallButton: Button {
        property color accent: "#616161"
        font.pixelSize: 10
        implicitHeight: 22
        background: Rectangle {
            color: parent.hovered ? "#EEEEEE" : "#F5F5F5"
            border.color: "#E0E0E0"
            border.width: 1
            radius: 4
        }
        contentItem: Text {
            text: parent.text
            font: parent.font
            color: parent.accent
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    ColumnLayout {
        width: root.width - 2
        spacing: 0

        // ─── ヘッダー + プリセット ───
        ColumnLayout {
            Layout.fillWidth: true
            Layout.margins: 12
            Layout.bottomMargin: 4
            spacing: 2

            Label {
                text: "チェック項目"
                font.pixelSize: 15
                font.bold: true
                color: "#212121"
            }
            Label {
                text: "プリセットを選び、チェックを個別に外したり足したりできます。設定は自動保存されます。"
                color: "#9E9E9E"
                font.pixelSize: 11
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }
            RowLayout {
                spacing: 12
                Layout.topMargin: 4
                RadioButton {
                    text: "推奨のみ"
                    font.pixelSize: 12
                    checked: root.preset === "recommended"
                    onToggled: if (checked) root.presetSelected("recommended")
                }
                RadioButton {
                    text: "すべて（細かい指摘を含む）"
                    font.pixelSize: 12
                    checked: root.preset === "all"
                    onToggled: if (checked) root.presetSelected("all")
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#EEEEEE"
            Layout.bottomMargin: 4
        }

        // ─── 話題別セクション ───
        Repeater {
            model: root.groups

            ColumnLayout {
                id: section
                Layout.fillWidth: true
                Layout.leftMargin: 8
                Layout.rightMargin: 8
                spacing: 0

                property var group: modelData
                property bool expanded: true

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    SectionHeader {
                        label: section.group.label
                        countText: root.enabledCount(section.group.rules) + " / " + section.group.rules.length
                        expanded: section.expanded
                        onClicked: section.expanded = !section.expanded
                    }
                    SmallButton {
                        text: "すべて ON"
                        accent: "#2E7D32"
                        onClicked: root.groupToggled(section.group.category, true)
                    }
                    SmallButton {
                        text: "すべて OFF"
                        accent: "#C62828"
                        onClicked: root.groupToggled(section.group.category, false)
                    }
                }

                Repeater {
                    model: section.expanded ? section.group.rules : []

                    RuleRow {
                        rule: modelData
                        ruleEnabled: root.enabledRules[modelData.id] === true
                        optionValues: root.ruleOptions[modelData.id]
                        onToggled: function (checked) { root.ruleToggled(modelData.id, checked); }
                        onOptionEdited: function (key, value) { root.ruleOptionChanged(modelData.id, key, value); }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 1
                    color: "#F5F5F5"
                }
            }
        }

        ColumnLayout {
            id: nurserySection
            visible: root.nursery.length > 0
            Layout.fillWidth: true
            Layout.leftMargin: 8
            Layout.rightMargin: 8
            spacing: 0

            property bool expanded: false

            SectionHeader {
                label: "試験中"
                countText: root.enabledCount(root.nursery) + " / " + root.nursery.length
                expanded: nurserySection.expanded
                onClicked: nurserySection.expanded = !nurserySection.expanded
            }
            Label {
                visible: nurserySection.expanded
                text: "誤検出の様子を見ているチェックです。どのプリセットにも含まれないので、試すときは 1 つずつ ON にしてください。"
                Layout.fillWidth: true
                Layout.leftMargin: 16
                Layout.bottomMargin: 6
                wrapMode: Text.WordWrap
                color: "#9E9E9E"
                font.pixelSize: 11
            }

            Repeater {
                model: nurserySection.expanded ? root.nursery : []

                RuleRow {
                    rule: modelData
                    ruleEnabled: root.enabledRules[modelData.id] === true
                    optionValues: root.ruleOptions[modelData.id]
                    onToggled: function (checked) { root.ruleToggled(modelData.id, checked); }
                    onOptionEdited: function (key, value) { root.ruleOptionChanged(modelData.id, key, value); }
                }
            }
        }

        // ─── 診断 ───
        Rectangle {
            Layout.fillWidth: true
            Layout.topMargin: 12
            height: 1
            color: "#EEEEEE"
        }

        ColumnLayout {
            Layout.fillWidth: true
            Layout.leftMargin: 8
            Layout.rightMargin: 8
            Layout.topMargin: 10
            spacing: 2

            Label {
                text: "診断"
                font.pixelSize: 12
                font.bold: true
                color: "#616161"
                font.letterSpacing: 0.5
            }

            RowLayout {
                spacing: 8
                Layout.fillWidth: true
                Layout.leftMargin: 16

                CheckBox {
                    checked: root.perfEnabled
                    onToggled: root.perfToggled(checked)
                }

                ColumnLayout {
                    spacing: 1
                    Layout.fillWidth: true

                    Label {
                        text: "実行時間の内訳を記録する"
                        font.pixelSize: 12
                        font.bold: true
                        color: "#212121"
                    }
                    Label {
                        text: "スナップショットタブに走査・チェックの内訳を表示します。通常は不要です。"
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        color: "#757575"
                        font.pixelSize: 11
                    }
                }
            }
        }

        Item { Layout.preferredHeight: 16 }
    }
}
