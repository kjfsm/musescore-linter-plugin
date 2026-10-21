import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: row
    Layout.fillWidth: true
    Layout.leftMargin: 16
    Layout.bottomMargin: 6
    spacing: 2

    // RuleInfo（Bundle.ruleCatalog の要素）
    property var rule: ({})
    property bool ruleEnabled: true
    // { key: 値 }。既定値で埋めた値が入る。
    property var optionValues: ({})

    signal toggled(bool checked)
    signal optionEdited(string key, var value)

    function optionValue(spec) {
        if (optionValues && optionValues[spec.key] !== undefined) return optionValues[spec.key];
        return spec["default"];
    }

    function isSelected(spec, value) {
        var current = optionValue(spec) || [];
        return current.indexOf(value) !== -1;
    }

    /** multiselect のトグル。spec.choices の順を保った新しい配列を返す。 */
    function toggledSelection(spec, value, checked) {
        var current = optionValue(spec) || [];
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

    function choiceIndex(spec) {
        var current = optionValue(spec);
        for (var i = 0; i < spec.choices.length; i++) {
            if (spec.choices[i].value === current) return i;
        }
        return 0;
    }

    RowLayout {
        spacing: 8
        Layout.fillWidth: true

        CheckBox {
            checked: row.ruleEnabled
            onToggled: row.toggled(checked)
        }

        ColumnLayout {
            spacing: 1
            Layout.fillWidth: true

            RowLayout {
                spacing: 6
                Label {
                    text: row.rule.name
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
                        if (row.rule.severity === "error")   return "#FFCDD2";
                        if (row.rule.severity === "warning") return "#FFE0B2";
                        return "#BBDEFB";
                    }
                    Label {
                        id: sevLabel
                        anchors.centerIn: parent
                        text: (row.rule.severity || "").toUpperCase()
                        font.pixelSize: 9
                        font.bold: true
                        color: {
                            if (row.rule.severity === "error")   return "#B71C1C";
                            if (row.rule.severity === "warning") return "#E65100";
                            return "#1565C0";
                        }
                    }
                }
                Rectangle {
                    visible: row.rule.tier === "pedantic"
                    implicitWidth: tierLabel.implicitWidth + 8
                    implicitHeight: 14
                    radius: 3
                    color: "#EEEEEE"
                    Label {
                        id: tierLabel
                        anchors.centerIn: parent
                        text: "細かい指摘"
                        font.pixelSize: 9
                        color: "#616161"
                    }
                }
            }

            Label {
                text: row.rule.description || ""
                visible: text.length > 0
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                color: "#757575"
                font.pixelSize: 11
            }

            // ─── ルール個別の設定（options 宣言から自動生成）───
            Repeater {
                model: row.rule.options || []

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

                    // ルールを無効にしても隠さない。消えると設定が失われたように見える。
                    ComboBox {
                        visible: spec.type === "select"
                        enabled: row.ruleEnabled
                        font.pixelSize: 11
                        implicitHeight: 26
                        Layout.preferredWidth: 200
                        model: row.choiceLabels(spec)
                        currentIndex: row.choiceIndex(spec)
                        // 引数を明示的に受ける。signal parameter injection に
                        // 頼ると、Repeater が注入する context property の `index`
                        // （options 配列内の位置）と衝突し、injection が無効化
                        // されたときにエラーなく別の選択肢が保存されてしまう。
                        onActivated: function (activatedIndex) {
                            row.optionEdited(spec.key, spec.choices[activatedIndex].value);
                        }
                    }

                    CheckBox {
                        visible: spec.type === "boolean"
                        enabled: row.ruleEnabled
                        text: spec.label
                        font.pixelSize: 11
                        checked: row.optionValue(spec) === true
                        onToggled: row.optionEdited(spec.key, checked)
                    }

                    Flow {
                        visible: spec.type === "multiselect"
                        Layout.fillWidth: true
                        spacing: 8

                        Repeater {
                            model: spec.type === "multiselect" ? spec.choices : []

                            CheckBox {
                                enabled: row.ruleEnabled
                                text: modelData.label
                                font.pixelSize: 11
                                checked: row.isSelected(spec, modelData.value)
                                onToggled: row.optionEdited(
                                    spec.key, row.toggledSelection(spec, modelData.value, checked))
                            }
                        }
                    }
                }
            }
        }
    }
}
