import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: root

    property var issuesList: []
    property bool hasRun: false
    property var parts: []
    property var checkers: []

    // 内部フィルタ状態
    property bool showError: true
    property bool showWarning: true
    property bool showInfo: true
    property string searchText: ""
    property string partFilter: ""
    property string ruleFilter: ""

    signal jumpRequested(var issue)
    signal copyRequested(string text)

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
            var sev = (it.severity || "info").toUpperCase();
            lines.push("[" + sev + "] " + part + it.message + measure);
        }
        return lines.join("\n");
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 6

        // ヘッダー: severity バッジ + コピー
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

            Item { Layout.fillWidth: true }

            Button {
                text: "問題をコピー"
                enabled: root.issuesList.length > 0
                onClicked: root.copyRequested(buildCopyText(filteredIssues()))
            }
        }

        // フィルタ: 検索 + パート + ルール
        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            TextField {
                id: searchField
                Layout.fillWidth: true
                placeholderText: "検索 (メッセージ・パート名)"
                text: root.searchText
                onTextChanged: root.searchText = text
            }

            ComboBox {
                id: partCombo
                Layout.preferredWidth: 140
                model: {
                    var m = ["(全パート)"];
                    for (var i = 0; i < root.parts.length; i++) m.push(root.parts[i].partName);
                    return m;
                }
                onCurrentIndexChanged: {
                    root.partFilter = currentIndex === 0 ? "" : model[currentIndex];
                }
            }

            ComboBox {
                id: ruleCombo
                Layout.preferredWidth: 160
                model: {
                    var m = ["(全ルール)"];
                    for (var i = 0; i < root.checkers.length; i++) m.push(root.checkers[i].id);
                    return m;
                }
                onCurrentIndexChanged: {
                    root.ruleFilter = currentIndex === 0 ? "" : model[currentIndex];
                }
            }
        }

        // リスト / 空状態
        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: "transparent"

            ListView {
                id: issuesView
                anchors.fill: parent
                clip: true
                spacing: 3
                model: filteredIssues()
                delegate: IssueDelegate {
                    issue: modelData
                    alternate: index % 2 === 0
                    onJumpRequested: root.jumpRequested(issue)
                }
                visible: filteredIssues().length > 0
            }

            // 空状態
            ColumnLayout {
                anchors.centerIn: parent
                spacing: 6
                visible: filteredIssues().length === 0

                Label {
                    Layout.alignment: Qt.AlignHCenter
                    text: {
                        if (!root.hasRun) return "「実行」ボタンを押してチェックを開始";
                        if (root.issuesList.length === 0) return "✓  問題は見つかりませんでした";
                        return "フィルタ条件に一致する問題はありません";
                    }
                    color: root.hasRun && root.issuesList.length === 0 ? "#2e7d32" : "#888888"
                    font.pixelSize: root.hasRun && root.issuesList.length === 0 ? 16 : 13
                    font.bold: root.hasRun && root.issuesList.length === 0
                }

                Label {
                    Layout.alignment: Qt.AlignHCenter
                    visible: root.hasRun && root.issuesList.length > 0
                    text: {
                        var filters = [];
                        if (!root.showError) filters.push("ERROR 非表示");
                        if (!root.showWarning) filters.push("WARNING 非表示");
                        if (!root.showInfo) filters.push("INFO 非表示");
                        if (root.partFilter !== "") filters.push("パート: " + root.partFilter);
                        if (root.ruleFilter !== "") filters.push("ルール: " + root.ruleFilter);
                        if (root.searchText !== "") filters.push("検索: " + root.searchText);
                        return filters.length > 0 ? filters.join(" / ") : "";
                    }
                    color: "#aaaaaa"
                    font.pixelSize: 11
                }
            }
        }
    }
}
