import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: root

    property var issuesList: []
    property bool hasRun: false
    property var parts: []
    property var checkers: []

    // フィルタ状態
    property bool showError: true
    property bool showWarning: true
    property bool showInfo: true
    property string searchText: ""
    property string partFilter: ""
    property string ruleFilter: ""

    signal copyRequested(string text)
    signal jumpRequested(var issue)

    function countBySeverity(sev) {
        var n = 0;
        for (var i = 0; i < issuesList.length; i++) {
            if (issuesList[i].severity === sev) n++;
        }
        return n;
    }

    function filteredIssues() {
        var out = [];
        var needle = (searchText || "").toLowerCase();
        for (var i = 0; i < issuesList.length; i++) {
            var it = issuesList[i];
            if (it.severity === "error"   && !showError)   continue;
            if (it.severity === "warning" && !showWarning) continue;
            if (it.severity === "info"    && !showInfo)    continue;
            if (partFilter !== "" && it.partName !== partFilter) continue;
            if (ruleFilter !== "" && it.ruleId   !== ruleFilter) continue;
            if (needle !== "") {
                var hay = ((it.message || "") + " " + (it.partName || "")).toLowerCase();
                if (hay.indexOf(needle) < 0) continue;
            }
            out.push(it);
        }
        return out;
    }

    function buildCopyText(arr) {
        if (!arr || arr.length === 0) return "";
        var lines = [];
        for (var i = 0; i < arr.length; i++) {
            var it = arr[i];
            var part = it.partName ? (it.partName + ": ") : "";
            var measure = it.measure > 0 ? (" 小節" + it.measure) : "";
            lines.push("[" + (it.severity || "info").toUpperCase() + "] " + part + it.message + measure);
        }
        return lines.join("\n");
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 6

        // ─── フィルタバー（severity バッジ + 検索 + コンボ + コピー） ───
        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            SeverityBadge {
                severity: "error"
                count: countBySeverity("error")
                active: showError
                onClicked: showError = !showError
            }
            SeverityBadge {
                severity: "warning"
                count: countBySeverity("warning")
                active: showWarning
                onClicked: showWarning = !showWarning
            }
            SeverityBadge {
                severity: "info"
                count: countBySeverity("info")
                active: showInfo
                onClicked: showInfo = !showInfo
            }

            // セパレータ
            Rectangle { width: 1; height: 22; color: "#E0E0E0" }

            TextField {
                id: searchField
                Layout.fillWidth: true
                Layout.minimumWidth: 80
                placeholderText: "検索…"
                text: root.searchText
                leftPadding: 8
                font.pixelSize: 12
                onTextChanged: root.searchText = text
                background: Rectangle {
                    color: "#F5F5F5"
                    radius: 4
                    border.color: searchField.activeFocus ? "#1E88E5" : "#E0E0E0"
                    border.width: 1
                }
            }

            ComboBox {
                id: partCombo
                Layout.preferredWidth: 110
                font.pixelSize: 11
                model: {
                    var m = ["パート ▾"];
                    for (var i = 0; i < root.parts.length; i++) m.push(root.parts[i].partName);
                    return m;
                }
                onCurrentIndexChanged: {
                    root.partFilter = currentIndex === 0 ? "" : model[currentIndex];
                }
            }

            ComboBox {
                id: ruleCombo
                Layout.preferredWidth: 120
                font.pixelSize: 11
                model: {
                    var m = ["ルール ▾"];
                    for (var i = 0; i < root.checkers.length; i++) m.push(root.checkers[i].id);
                    return m;
                }
                onCurrentIndexChanged: {
                    root.ruleFilter = currentIndex === 0 ? "" : model[currentIndex];
                }
            }

            Button {
                text: "コピー"
                font.pixelSize: 11
                enabled: root.issuesList.length > 0
                onClicked: root.copyRequested(buildCopyText(filteredIssues()))
                background: Rectangle {
                    color: parent.pressed ? "#E3F2FD" : (parent.hovered ? "#F3F9FF" : "white")
                    border.color: "#BBDEFB"
                    border.width: 1
                    radius: 4
                }
            }
        }

        // 区切り線
        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#EEEEEE"
        }

        // ─── Issue リスト / 空状態 ───
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            // リスト
            ListView {
                id: issuesView
                anchors.fill: parent
                clip: true
                spacing: 4
                model: filteredIssues()
                visible: filteredIssues().length > 0

                delegate: IssueDelegate {
                    issue: modelData
                    alternate: index % 2 !== 0
                    width: issuesView.width
                    onClicked: root.jumpRequested(modelData)
                }

                ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }
            }

            // 空状態
            ColumnLayout {
                anchors.centerIn: parent
                spacing: 10
                visible: filteredIssues().length === 0

                Label {
                    Layout.alignment: Qt.AlignHCenter
                    font.pixelSize: 32
                    text: {
                        if (!root.hasRun) return "✎";
                        if (root.issuesList.length === 0) return "✓";
                        return "⊘";
                    }
                    color: {
                        if (!root.hasRun) return "#BDBDBD";
                        if (root.issuesList.length === 0) return "#4CAF50";
                        return "#BDBDBD";
                    }
                }

                Label {
                    Layout.alignment: Qt.AlignHCenter
                    font.pixelSize: 14
                    font.bold: !root.hasRun || root.issuesList.length === 0
                    text: {
                        if (!root.hasRun) return "「実行」ボタンでチェック開始";
                        if (root.issuesList.length === 0) return "問題は見つかりませんでした";
                        return "フィルタ条件に一致する問題はありません";
                    }
                    color: {
                        if (root.hasRun && root.issuesList.length === 0) return "#388E3C";
                        return "#9E9E9E";
                    }
                }

                // アクティブなフィルタの説明
                Label {
                    Layout.alignment: Qt.AlignHCenter
                    visible: root.hasRun && root.issuesList.length > 0
                    font.pixelSize: 11
                    color: "#BDBDBD"
                    text: {
                        var f = [];
                        if (!root.showError)   f.push("ERROR 非表示");
                        if (!root.showWarning) f.push("WARN 非表示");
                        if (!root.showInfo)    f.push("INFO 非表示");
                        if (root.partFilter)   f.push("パート: " + root.partFilter);
                        if (root.ruleFilter)   f.push("ルール: " + root.ruleFilter);
                        if (root.searchText)   f.push("\"" + root.searchText + "\"");
                        return f.join("  ·  ");
                    }
                }
            }
        }
    }
}
