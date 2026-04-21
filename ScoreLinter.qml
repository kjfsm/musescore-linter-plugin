import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Qt.labs.settings 1.0
import MuseScore 3.0

import "src/snapshot.js" as Snapshot
import "src/linter.js" as Linter
import "qml"

MuseScore {
    id: plugin

    menuPath: "Plugins.Score Linter"
    description: "楽譜の問題点を検出・一覧表示するリンター"
    version: "2.0"
    pluginType: "dialog"
    width: 560
    height: 640

    property var enabledRules: ({})
    property var issuesList: []
    property var checkerList: []
    property string snapshotText: ""
    property bool hasRun: false

    Settings {
        id: persistedSettings
        category: "ScoreLinter"
        property string rulesJson: "{}"
    }

    onRun: {
        initialize();
    }

    function initialize() {
        try {
            checkerList = Linter.getCheckerList();
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
            console.warn("[ScoreLinter] rulesJson のパースに失敗、初期状態で復元: " + e);
            persisted = {};
        }
        var rules = {};
        for (var i = 0; i < checkerList.length; i++) {
            var c = checkerList[i];
            rules[c.id] = (persisted[c.id] !== undefined)
                ? !!persisted[c.id]
                : (c.defaultEnabled !== false);
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
            statusLabel.text = "スコア未選択";
            tabBar.currentIndex = 0;
            return;
        }

        statusLabel.text = "実行中…";

        try {
            var enums = {
                CHORD: Element.CHORD,
                REST: Element.REST,
                BAR_LINE: Element.BAR_LINE,
                BARLINE_DOUBLE: (typeof BarLineType !== "undefined" && BarLineType.DOUBLE !== undefined)
                    ? BarLineType.DOUBLE : null,
                TEMPO_TEXT: Element.TEMPO_TEXT,
                STAFF_TEXT: Element.STAFF_TEXT,
                SYSTEM_TEXT: Element.SYSTEM_TEXT,
                EXPRESSION: Element.EXPRESSION,
                REHEARSAL_MARK: Element.REHEARSAL_MARK,
                DYNAMIC: Element.DYNAMIC
            };
            var snapshot = Snapshot.buildSnapshot(curScore, enums);
            snapshotText = JSON.stringify(snapshot, null, 2);
            issuesList = Linter.runAllCheckers(snapshot, enabledRules);
            hasRun = true;
            statusLabel.text = summaryText(issuesList);
            tabBar.currentIndex = 0;
        } catch (e) {
            console.error("[ScoreLinter] runLinter 失敗: " + e);
            issuesList = [internalIssue("実行中にエラーが発生しました: " + e)];
            hasRun = true;
            statusLabel.text = "エラー";
        }
    }

    function internalIssue(msg) {
        return {
            ruleId: "internal", severity: "error", category: "internal",
            message: msg, partName: "", staffIdx: -1,
            measure: 0, tick: 0, detail: null
        };
    }

    function summaryText(issues) {
        if (!issues || issues.length === 0) return "問題は見つかりませんでした";
        var n = { error: 0, warning: 0, info: 0 };
        for (var i = 0; i < issues.length; i++) {
            var s = issues[i].severity;
            if (n[s] !== undefined) n[s]++;
        }
        return n.error + " error / " + n.warning + " warning / " + n.info + " info";
    }

    function jumpToIssue(issue) {
        if (!curScore || !issue) return;
        try {
            var cursor = curScore.newCursor();
            cursor.staffIdx = Math.max(0, issue.staffIdx || 0);
            cursor.voice = 0;

            if (typeof cursor.rewindToTick === "function" && issue.tick >= 0) {
                cursor.rewindToTick(issue.tick);
            } else {
                cursor.rewind(Cursor.SCORE_START);
                var target = Math.max(1, issue.measure || 1);
                for (var i = 0; i < target - 1; i++) {
                    if (!cursor.nextMeasure()) break;
                }
            }
            if (cursor.element) curScore.selection.select(cursor.element);
        } catch (e) {
            console.warn("[ScoreLinter] jumpToIssue 失敗: " + e);
        }
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

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 10
        spacing: 10

        // ヘッダー
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Label {
                text: "Score Linter"
                font.pixelSize: 18
                font.bold: true
            }

            Label {
                id: statusLabel
                text: ""
                color: "#666666"
                font.pixelSize: 12
                Layout.fillWidth: true
            }

            Button {
                text: "実行"
                highlighted: true
                onClicked: plugin.runLinter()
            }
        }

        // タブバー
        TabBar {
            id: tabBar
            Layout.fillWidth: true

            TabButton { text: "問題" }
            TabButton { text: "設定" }
            TabButton { text: "スナップショット" }
        }

        // タブコンテンツ
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: tabBar.currentIndex

            IssuesPanel {
                id: issuesPanel
                issuesList: plugin.issuesList
                hasRun: plugin.hasRun
                parts: plugin.parts()
                checkers: plugin.checkerList
                onJumpRequested: plugin.jumpToIssue(issue)
                onCopyRequested: plugin.copyToClipboard(text)
            }

            SettingsPanel {
                id: settingsPanel
                checkers: plugin.checkerList
                enabledRules: plugin.enabledRules
                onRuleToggled: plugin.setRuleEnabled(ruleId, checked)
            }

            SnapshotPanel {
                id: snapshotPanel
                snapshotText: plugin.snapshotText
                onCopyRequested: plugin.copyToClipboard(text)
            }
        }
    }

    // クリップボード用の非表示 TextArea
    TextArea {
        id: clipboardHelper
        visible: false
        width: 0
        height: 0
    }
}
