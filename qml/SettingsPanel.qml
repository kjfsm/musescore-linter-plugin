import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ScrollView {
    id: root
    clip: true

    property var checkers: []
    property var enabledRules: ({})
    // ruleId → { key: 値 }。checker の options 宣言に沿って解決済みの値が入る。
    property var ruleOptions: ({})
    property bool perfEnabled: false

    signal ruleToggled(string ruleId, bool checked)
    signal ruleOptionChanged(string ruleId, string key, var value)
    signal perfToggled(bool checked)

    /** ruleId/key の現在値。未設定なら spec の既定値。 */
    function optionValue(ruleId, spec) {
        var forRule = ruleOptions[ruleId];
        if (forRule && forRule[spec.key] !== undefined) return forRule[spec.key];
        return spec["default"];
    }

    function isSelected(ruleId, spec, value) {
        var current = optionValue(ruleId, spec) || [];
        return current.indexOf(value) !== -1;
    }

    /** multiselect のトグル。spec.choices の順を保った新しい配列を返す。 */
    function toggledSelection(ruleId, spec, value, checked) {
        var current = optionValue(ruleId, spec) || [];
        var out = [];
        for (var i = 0; i < spec.choices.length; i++) {
            var v = spec.choices[i].value;
            var on = v === value ? checked : current.indexOf(v) !== -1;
            if (on) out.push(v);
        }
        return out;
    }

    function choiceLabels(spec) {
        var out = [];
        for (var i = 0; i < spec.choices.length; i++) out.push(spec.choices[i].label);
        return out;
    }

    function choiceIndex(ruleId, spec) {
        var current = optionValue(ruleId, spec);
        for (var i = 0; i < spec.choices.length; i++) {
            if (spec.choices[i].value === current) return i;
        }
        return 0;
    }

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

                Item {
                    Layout.fillWidth: true
                    Layout.topMargin: 10
                    Layout.bottomMargin: 6
                    implicitHeight: headerRow.implicitHeight

                    RowLayout {
                        id: headerRow
                        anchors.fill: parent
                        spacing: 6

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
                    }

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
                        Layout.bottomMargin: 6
                        spacing: 2

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

                                // ─── checker 個別の設定（options 宣言から自動生成）───
                                Repeater {
                                    id: optionRepeater
                                    property string ruleId: modelData.id
                                    // ルールを無効にしても隠さない。消えると設定が失われたように見える。
                                    property bool ruleEnabled: root.enabledRules[modelData.id] !== false
                                    model: modelData.options || []

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        Layout.topMargin: 4
                                        spacing: 2

                                        property var spec: modelData

                                        Label {
                                            // boolean は CheckBox 自身がラベルを持つので二重に出さない
                                            visible: spec.type !== "boolean"
                                            text: spec.label
                                            color: "#9E9E9E"
                                            font.pixelSize: 10
                                        }

                                        // select
                                        ComboBox {
                                            visible: spec.type === "select"
                                            enabled: optionRepeater.ruleEnabled
                                            font.pixelSize: 11
                                            implicitHeight: 26
                                            Layout.preferredWidth: 200
                                            model: root.choiceLabels(spec)
                                            currentIndex: root.choiceIndex(optionRepeater.ruleId, spec)
                                            // 引数を明示的に受ける。signal parameter injection に
                                            // 頼ると、Repeater が注入する context property の `index`
                                            // （options 配列内の位置）と衝突し、injection が無効化
                                            // されたときにエラーなく別の選択肢が保存されてしまう。
                                            onActivated: function (activatedIndex) {
                                                root.ruleOptionChanged(
                                                    optionRepeater.ruleId, spec.key,
                                                    spec.choices[activatedIndex].value);
                                            }
                                        }

                                        // boolean
                                        CheckBox {
                                            visible: spec.type === "boolean"
                                            enabled: optionRepeater.ruleEnabled
                                            text: spec.label
                                            font.pixelSize: 11
                                            checked: root.optionValue(optionRepeater.ruleId, spec) === true
                                            onToggled: root.ruleOptionChanged(
                                                optionRepeater.ruleId, spec.key, checked)
                                        }

                                        // multiselect
                                        Flow {
                                            visible: spec.type === "multiselect"
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Repeater {
                                                model: spec.type === "multiselect" ? spec.choices : []

                                                CheckBox {
                                                    enabled: optionRepeater.ruleEnabled
                                                    text: modelData.label
                                                    font.pixelSize: 11
                                                    checked: root.isSelected(
                                                        optionRepeater.ruleId, spec, modelData.value)
                                                    onToggled: root.ruleOptionChanged(
                                                        optionRepeater.ruleId, spec.key,
                                                        root.toggledSelection(
                                                            optionRepeater.ruleId, spec, modelData.value, checked))
                                                }
                                            }
                                        }
                                    }
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
