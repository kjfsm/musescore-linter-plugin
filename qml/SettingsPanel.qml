import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ScrollView {
    id: root
    clip: true

    property var checkers: []
    property var enabledRules: ({})

    signal ruleToggled(string ruleId, bool checked)

    // カテゴリ表示名マップ
    readonly property var categoryLabels: {
        "articulation": "アーティキュレーション",
        "dynamics":     "ダイナミクス",
        "tempo":        "テンポ",
        "notation":     "記譜"
    }
    readonly property var categoryOrder: ["tempo", "dynamics", "articulation", "notation"]

    function checkersByCategory(cat) {
        var out = [];
        for (var i = 0; i < checkers.length; i++) {
            if (checkers[i].category === cat) out.push(checkers[i]);
        }
        return out;
    }

    function allEnabled() {
        for (var i = 0; i < checkers.length; i++) {
            if (enabledRules[checkers[i].id] === false) return false;
        }
        return true;
    }

    ColumnLayout {
        width: root.width - 2
        spacing: 0

        // ─── ヘッダー + 全有効/無効ボタン ───
        RowLayout {
            Layout.fillWidth: true
            Layout.margins: 12
            Layout.bottomMargin: 4

            ColumnLayout {
                spacing: 2
                Label {
                    text: "チェック項目"
                    font.pixelSize: 15
                    font.bold: true
                    color: "#212121"
                }
                Label {
                    text: "チェックを外すと無効になります。設定は自動保存されます。"
                    color: "#9E9E9E"
                    font.pixelSize: 11
                    Layout.fillWidth: true
                }
            }

            Item { Layout.fillWidth: true }

            // 全有効 / 全無効ボタン
            RowLayout {
                spacing: 6
                Button {
                    text: "すべて有効"
                    font.pixelSize: 11
                    onClicked: {
                        for (var i = 0; i < root.checkers.length; i++) {
                            root.ruleToggled(root.checkers[i].id, true);
                        }
                    }
                    background: Rectangle {
                        color: parent.hovered ? "#E8F5E9" : "#F5F5F5"
                        border.color: "#A5D6A7"
                        border.width: 1
                        radius: 4
                    }
                    contentItem: Text {
                        text: parent.text
                        font: parent.font
                        color: "#2E7D32"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
                Button {
                    text: "すべて無効"
                    font.pixelSize: 11
                    onClicked: {
                        for (var i = 0; i < root.checkers.length; i++) {
                            root.ruleToggled(root.checkers[i].id, false);
                        }
                    }
                    background: Rectangle {
                        color: parent.hovered ? "#FFEBEE" : "#F5F5F5"
                        border.color: "#FFCDD2"
                        border.width: 1
                        radius: 4
                    }
                    contentItem: Text {
                        text: parent.text
                        font: parent.font
                        color: "#C62828"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }

        // 区切り線
        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#EEEEEE"
            Layout.bottomMargin: 4
        }

        // ─── カテゴリ別セクション ───
        Repeater {
            model: root.categoryOrder

            ColumnLayout {
                id: section
                Layout.fillWidth: true
                Layout.leftMargin: 8
                Layout.rightMargin: 8
                spacing: 0

                property string catId: modelData
                property var catCheckers: root.checkersByCategory(modelData)
                visible: catCheckers.length > 0

                // カテゴリヘッダー（折りたたみ可能）
                property bool expanded: true

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    topPadding: 10
                    bottomPadding: 6

                    Label {
                        text: section.expanded ? "▾" : "▸"
                        color: "#9E9E9E"
                        font.pixelSize: 11
                    }
                    Label {
                        text: root.categoryLabels[section.catId] || section.catId
                        font.pixelSize: 12
                        font.bold: true
                        color: "#616161"
                        font.letterSpacing: 0.5
                    }
                    Item { Layout.fillWidth: true }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: section.expanded = !section.expanded
                    }
                }

                // checker 一覧（折りたたみ）
                Repeater {
                    model: section.expanded ? section.catCheckers : []

                    ColumnLayout {
                        Layout.fillWidth: true
                        Layout.leftMargin: 16
                        spacing: 2
                        bottomPadding: 6

                        RowLayout {
                            spacing: 8
                            Layout.fillWidth: true

                            CheckBox {
                                id: cb
                                checked: root.enabledRules[modelData.id] !== false
                                onToggled: root.ruleToggled(modelData.id, checked)
                            }

                            ColumnLayout {
                                spacing: 1
                                Layout.fillWidth: true

                                RowLayout {
                                    spacing: 6
                                    Label {
                                        text: modelData.name
                                        font.pixelSize: 12
                                        font.bold: true
                                        color: "#212121"
                                    }
                                    // severity バッジ
                                    Rectangle {
                                        implicitWidth: sevLabel.implicitWidth + 8
                                        implicitHeight: 14
                                        radius: 3
                                        color: {
                                            if (modelData.severity === "error")   return "#FFCDD2";
                                            if (modelData.severity === "warning") return "#FFE0B2";
                                            return "#BBDEFB";
                                        }
                                        Label {
                                            id: sevLabel
                                            anchors.centerIn: parent
                                            text: modelData.severity.toUpperCase()
                                            font.pixelSize: 9
                                            font.bold: true
                                            color: {
                                                if (modelData.severity === "error")   return "#B71C1C";
                                                if (modelData.severity === "warning") return "#E65100";
                                                return "#1565C0";
                                            }
                                        }
                                    }
                                }

                                Label {
                                    text: modelData.description || ""
                                    visible: text.length > 0
                                    Layout.fillWidth: true
                                    wrapMode: Text.WordWrap
                                    color: "#757575"
                                    font.pixelSize: 11
                                }
                            }
                        }
                    }
                }

                // セパレータ
                Rectangle {
                    Layout.fillWidth: true
                    height: 1
                    color: "#F5F5F5"
                }
            }
        }

        Item { Layout.preferredHeight: 16 }
    }
}
