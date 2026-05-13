import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import MuseScore 3.0

import "dist/bundle.js" as Bundle
import "qml"

MuseScore {
    id: plugin

    menuPath: "Plugins.Score Linter"
    description: "楽譜の問題点を検出・一覧表示するリンター"
    version: "2.0"
    pluginType: "dialog"
    width: 720
    height: 680

    property var enabledRules: ({})
    property var issuesList: []
    property var checkerList: []
    property string snapshotText: ""
    property bool hasRun: false

    // 実行統計
    readonly property int errorCount: {
        var n = 0;
        for (var i = 0; i < issuesList.length; i++) if (issuesList[i].severity === "error") n++;
        return n;
    }
    readonly property int warningCount: {
        var n = 0;
        for (var i = 0; i < issuesList.length; i++) if (issuesList[i].severity === "warning") n++;
        return n;
    }
    readonly property int infoCount: {
        var n = 0;
        for (var i = 0; i < issuesList.length; i++) if (issuesList[i].severity === "info") n++;
        return n;
    }

    QtObject {
        id: persistedSettings
        property string rulesJson: "{}"
    }

    onRun: {
        initialize();
    }

    function initialize() {
        try {
            checkerList = Bundle.getCheckerList();
        } catch (e) {
            console.error("[ScoreLinter] checker 取得失敗: " + e);
            checkerList = [];
        }
        loadEnabledRules();
    }

    function loadEnabledRules() {
        var persisted = {};
        try {
            persisted = JSON.parse(persistedSettings.rulesJson || "{}") || {};
        } catch (e) {
            console.warn("[ScoreLinter] rulesJson パース失敗、初期状態で復元: " + e);
            persisted = {};
        }
        var rules = {};
        for (var i = 0; i < checkerList.length; i++) {
            var c = checkerList[i];
            rules[c.id] = (persisted[c.id] !== undefined) ? !!persisted[c.id] : (c.defaultEnabled !== false);
        }
        enabledRules = rules;
    }

    function setRuleEnabled(ruleId, checked) {
        var rules = {};
        for (var k in enabledRules) if (enabledRules.hasOwnProperty(k)) rules[k] = enabledRules[k];
        rules[ruleId] = checked;
        enabledRules = rules;
        persistedSettings.rulesJson = JSON.stringify(rules);
    }

    function runLinter() {
        snapshotText = "";
        if (!curScore) {
            issuesList = [internalIssue("スコアが開かれていません")];
            hasRun = true;
            tabBar.currentIndex = 0;
            return;
        }

        try {
            var snapshot = Bundle.buildSnapshot(curScore);
            snapshotText = JSON.stringify(snapshot, null, 2);
            issuesList = Bundle.runAllCheckers(snapshot, enabledRules);
            hasRun = true;
            tabBar.currentIndex = 0;
        } catch (e) {
            console.error("[ScoreLinter] runLinter 失敗: " + e);
            issuesList = [internalIssue("実行中にエラーが発生しました: " + e)];
            hasRun = true;
        }
    }

    function internalIssue(msg) {
        return {
            ruleId: "internal", severity: "error", category: "internal",
            message: msg, partName: "", staffIdx: -1, measure: 0, tick: 0, detail: null
        };
    }

    function jumpToIssue(issue) {
        if (!curScore || !issue || issue.measure <= 0) return;

        // 小節番号から Measure オブジェクトを取得
        var m = curScore.firstMeasure;
        for (var i = 1; i < issue.measure && m; i++) {
            m = m.nextMeasure;
        }
        if (!m || !m.firstSegment) return;

        var staffIdx = (issue.staffIdx !== undefined && issue.staffIdx >= 0) ? issue.staffIdx : 0;
        var startTick = m.firstSegment.tick;
        var lastSeg = m.lastSegment;
        var endTick = lastSeg ? lastSeg.tick + 1 : startTick + 1;

        curScore.startCmd();
        curScore.selection.selectRange(startTick, endTick, staffIdx, staffIdx + 1);
        curScore.endCmd();
    }

    function copyToClipboard(text) {
        if (!text || text.length === 0) return;
        clipboardHelper.text = text;
        clipboardHelper.selectAll();
        clipboardHelper.copy();
        clipboardHelper.deselect();
    }

    function parts() {
        if (hasRun && snapshotText && snapshotText.length > 0) {
            try {
                var snap = JSON.parse(snapshotText);
                if (snap && snap.meta && snap.meta.parts) return snap.meta.parts;
            } catch (e) { /* ignore */ }
        }
        return [];
    }

    // ─── UI ───────────────────────────────────────────────────────────────

    Rectangle {
        anchors.fill: parent
        color: "#FAFAFA"

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 0
            spacing: 0

            // ─── ヘッダーバー ───
            Rectangle {
                Layout.fillWidth: true
                height: 52
                color: "#FFFFFF"
                // 下線
                Rectangle {
                    anchors.bottom: parent.bottom
                    width: parent.width; height: 1
                    color: "#E0E0E0"
                }

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 16
                    anchors.rightMargin: 12
                    spacing: 10

                    // タイトル
                    Label {
                        text: "Score Linter"
                        font.pixelSize: 17
                        font.bold: true
                        color: "#212121"
                    }

                    // ビルド日時
                    Label {
                        text: "__BUILD_DATE__"
                        font.pixelSize: 10
                        color: "#9E9E9E"
                        Layout.alignment: Qt.AlignVCenter
                    }

                    // 実行後のサマリーバッジ
                    RowLayout {
                        spacing: 6
                        visible: hasRun && issuesList.length > 0

                        Repeater {
                            model: [
                                { sev: "error",   count: errorCount   },
                                { sev: "warning", count: warningCount },
                                { sev: "info",    count: infoCount    }
                            ]
                            Rectangle {
                                visible: modelData.count > 0
                                implicitWidth: Math.max(24, summaryLabel.implicitWidth + 10)
                                implicitHeight: 18
                                radius: 9
                                color: {
                                    if (modelData.sev === "error")   return "#FFCDD2";
                                    if (modelData.sev === "warning") return "#FFE0B2";
                                    return "#BBDEFB";
                                }
                                Label {
                                    id: summaryLabel
                                    anchors.centerIn: parent
                                    text: modelData.count
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: {
                                        if (modelData.sev === "error")   return "#B71C1C";
                                        if (modelData.sev === "warning") return "#E65100";
                                        return "#1565C0";
                                    }
                                }
                            }
                        }
                    }

                    Label {
                        visible: hasRun && issuesList.length === 0
                        text: "✓  問題なし"
                        color: "#388E3C"
                        font.pixelSize: 12
                    }

                    Item { Layout.fillWidth: true }

                    // 実行ボタン
                    Button {
                        text: "実行"
                        font.pixelSize: 13
                        font.bold: true
                        implicitHeight: 34
                        implicitWidth: 70
                        onClicked: plugin.runLinter()
                        background: Rectangle {
                            color: parent.pressed ? "#1565C0" : (parent.hovered ? "#1976D2" : "#2196F3")
                            radius: 6
                            Behavior on color { ColorAnimation { duration: 80 } }
                        }
                        contentItem: Text {
                            text: parent.text
                            font: parent.font
                            color: "white"
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }

            // ─── タブバー ───
            TabBar {
                id: tabBar
                Layout.fillWidth: true
                background: Rectangle { color: "#FFFFFF" }

                TabButton {
                    text: "問題"
                    font.pixelSize: 12
                    background: Rectangle {
                        color: parent.checked ? "#FFFFFF" : "#F5F5F5"
                        // アクティブタブの下線
                        Rectangle {
                            anchors.bottom: parent.bottom
                            width: parent.width; height: 2
                            color: parent.parent.checked ? "#2196F3" : "transparent"
                        }
                    }
                }
                TabButton {
                    text: "設定"
                    font.pixelSize: 12
                    background: Rectangle {
                        color: parent.checked ? "#FFFFFF" : "#F5F5F5"
                        Rectangle {
                            anchors.bottom: parent.bottom
                            width: parent.width; height: 2
                            color: parent.parent.checked ? "#2196F3" : "transparent"
                        }
                    }
                }
                TabButton {
                    text: "スナップショット"
                    font.pixelSize: 12
                    background: Rectangle {
                        color: parent.checked ? "#FFFFFF" : "#F5F5F5"
                        Rectangle {
                            anchors.bottom: parent.bottom
                            width: parent.width; height: 2
                            color: parent.parent.checked ? "#2196F3" : "transparent"
                        }
                    }
                }
            }

            // タブ下線
            Rectangle {
                Layout.fillWidth: true
                height: 1
                color: "#E0E0E0"
            }

            // ─── タブコンテンツ ───
            StackLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                currentIndex: tabBar.currentIndex

                // 問題タブ
                Item {
                    Rectangle {
                        anchors.fill: parent
                        anchors.margins: 10
                        color: "transparent"
                        IssuesPanel {
                            anchors.fill: parent
                            issuesList: plugin.issuesList
                            hasRun: plugin.hasRun
                            parts: plugin.parts()
                            checkers: plugin.checkerList
                            onCopyRequested: plugin.copyToClipboard(text)
                            onJumpRequested: plugin.jumpToIssue(issue)
                        }
                    }
                }

                // 設定タブ
                Item {
                    SettingsPanel {
                        anchors.fill: parent
                        anchors.margins: 10
                        checkers: plugin.checkerList
                        enabledRules: plugin.enabledRules
                        onRuleToggled: plugin.setRuleEnabled(ruleId, checked)
                    }
                }

                // スナップショットタブ
                Item {
                    SnapshotPanel {
                        anchors.fill: parent
                        anchors.margins: 10
                        snapshotText: plugin.snapshotText
                        onCopyRequested: plugin.copyToClipboard(text)
                    }
                }
            }
        }
    }

    // クリップボード用の非表示 TextArea
    TextArea {
        id: clipboardHelper
        visible: false
        width: 0; height: 0
    }
}
