import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import MuseScore 3.0

import "snapshot.js" as Snapshot
import "linter.js" as Linter

MuseScore {
    menuPath: "Plugins.Score Linter"
    description: "楽譜の問題点を検出・一覧表示するリンター"
    version: "1.0"
    pluginType: "dialog"
    width: 450
    height: 550

    property var enabledRules: ({})
    property var issuesList: []
    property string snapshotText: ""
    property string issuesCopyText: ""

    Settings {
        id: persistedSettings
        category: "ScoreLinter"
        property bool rulePizzArco: true
        property bool ruleSordino: true
        property bool ruleSoloTutti: true
        property bool ruleDivUnis: true
        property bool ruleRestAnnotation: true
        property bool ruleTempoBarline: true
        property bool ruleOpeningTempo: true
        property bool ruleFirstNoteDynamics: true
    }

    onRun: {
        initSettings();
    }

    function initSettings() {
        enabledRules = {
            "pizz-arco": persistedSettings.rulePizzArco,
            "sordino": persistedSettings.ruleSordino,
            "solo-tutti": persistedSettings.ruleSoloTutti,
            "div-unis": persistedSettings.ruleDivUnis,
            "rest-annotation": persistedSettings.ruleRestAnnotation,
            "tempo-barline": persistedSettings.ruleTempoBarline,
            "opening-tempo": persistedSettings.ruleOpeningTempo,
            "first-note-dynamics": persistedSettings.ruleFirstNoteDynamics
        };
    }

    function runLinter() {
        issuesModel.clear();
        issuesList = [];
        snapshotText = "";

        if (!curScore) {
            issuesCopyText = "";
            issuesModel.append({
                severity: "error",
                message: "スコアが開かれていません",
                partName: "",
                measure: 0,
                tick: 0,
                staffIdx: 0,
                ruleId: ""
            });
            return;
        }

        var snapshot = Snapshot.buildSnapshot(curScore, {
            CHORD: Element.CHORD,
            REST: Element.REST,
            BAR_LINE: Element.BAR_LINE,
            TEMPO_TEXT: Element.TEMPO_TEXT,
            STAFF_TEXT: Element.STAFF_TEXT,
            SYSTEM_TEXT: Element.SYSTEM_TEXT,
            EXPRESSION: Element.EXPRESSION,
            REHEARSAL_MARK: Element.REHEARSAL_MARK,
            DYNAMIC: Element.DYNAMIC
        });
        snapshotText = JSON.stringify(snapshot, null, 2);

        var issues = Linter.runAllCheckers(snapshot, enabledRules);
        issuesList = issues;
        issuesCopyText = buildIssuesCopyText(issues);
        console.log("[ScoreLinter] 実行完了: " + issues.length + " 件の問題を検出");

        if (issues.length === 0) {
            issuesModel.append({
                severity: "info",
                message: "問題は見つかりませんでした",
                partName: "",
                measure: 0,
                tick: 0,
                staffIdx: 0,
                ruleId: ""
            });
        } else {
            for (var i = 0; i < issues.length; i++) {
                issuesModel.append(issues[i]);
            }
        }

        statusText.text = issues.length + " 件の問題";
        tabBar.currentIndex = 0;
    }


    function buildIssuesCopyText(issues) {
        if (!issues || issues.length === 0) return "";
        var lines = [];
        for (var i = 0; i < issues.length; i++) {
            var issue = issues[i];
            var part = issue.partName ? (issue.partName + ": ") : "";
            var measure = issue.measure > 0 ? (" 小節" + issue.measure) : "";
            var sev = (issue.severity || "info").toUpperCase();
            lines.push("[" + sev + "] " + part + issue.message + measure);
        }
        return lines.join("\n");
    }

    function jumpToIssue(issue) {
        if (!curScore) return;

        var targetTick = issue.tick;
        var targetStaffIdx = issue.staffIdx;
        var targetMeasure = issue.measure;
        var selected = false;

        // tick があれば優先して厳密に対象位置を探索する
        if (targetTick !== undefined && targetTick !== null && targetTick >= 0) {
            var mTick = curScore.firstMeasure;
            while (mTick && !selected) {
                for (var segTick = mTick.firstSegment; segTick; segTick = segTick.nextInMeasure) {
                    if (segTick.tick !== targetTick) continue;

                    // 1) まず annotation を優先的に選択
                    if (segTick.annotations) {
                        var unresolvedAnn = null;
                        for (var a = 0; a < segTick.annotations.length; a++) {
                            var ann = segTick.annotations[a];
                            var annStaffIdx = -1;
                            if (ann.track !== undefined && ann.track !== null && ann.track >= 0) {
                                annStaffIdx = Math.floor(ann.track / 4);
                            } else if (ann.staffIdx !== undefined && ann.staffIdx !== null && ann.staffIdx >= 0) {
                                annStaffIdx = ann.staffIdx;
                            }
                            if (annStaffIdx === targetStaffIdx) {
                                curScore.selection.select(ann);
                                selected = true;
                                break;
                            }
                            // staff が解決できない注記は最後のフォールバック候補にする
                            if (annStaffIdx < 0 && unresolvedAnn === null) {
                                unresolvedAnn = ann;
                            }
                        }
                        if (!selected && unresolvedAnn !== null) {
                            curScore.selection.select(unresolvedAnn);
                            selected = true;
                        }
                    }
                    if (selected) break;

                    // 2) annotation がなければ該当 staff の要素を選択
                    var trackAtTick = targetStaffIdx * 4;
                    var elAtTick = segTick.elementAt(trackAtTick);
                    if (elAtTick) {
                        curScore.selection.select(elAtTick);
                        selected = true;
                        break;
                    }
                }
                mTick = mTick.nextMeasure;
            }
        }

        // tick で見つからない場合は従来の measure ベースでフォールバック
        if (!selected && targetMeasure > 0) {
            var cursor = curScore.newCursor();
            cursor.rewind(Cursor.SCORE_START);
            for (var i = 0; i < targetMeasure - 1; i++) {
                cursor.nextMeasure();
            }
            var m = cursor.measure;
            if (m) {
                for (var seg = m.firstSegment; seg; seg = seg.nextInMeasure) {
                    if (seg.annotations) {
                        for (var j = 0; j < seg.annotations.length; j++) {
                            var fallbackAnn = seg.annotations[j];
                            var fallbackStaffIdx = -1;
                            if (fallbackAnn.track !== undefined && fallbackAnn.track !== null && fallbackAnn.track >= 0) {
                                fallbackStaffIdx = Math.floor(fallbackAnn.track / 4);
                            } else if (fallbackAnn.staffIdx !== undefined && fallbackAnn.staffIdx !== null && fallbackAnn.staffIdx >= 0) {
                                fallbackStaffIdx = fallbackAnn.staffIdx;
                            }
                            if (fallbackStaffIdx === targetStaffIdx) {
                                curScore.selection.select(fallbackAnn);
                                selected = true;
                                break;
                            }
                        }
                    }
                    if (selected) break;
                }
            }
            if (!selected && m && m.firstSegment) {
                var track = targetStaffIdx * 4;
                var el = m.firstSegment.elementAt(track);
                if (el) {
                    curScore.selection.select(el);
                    selected = true;
                }
            }
        }

        // ジャンプ機能は選択位置の移動のみを行い、
        // ノート入力モードなどの編集状態は変更しない。
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 8
        spacing: 8

        // ヘッダー
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Label {
                text: "Score Linter"
                font.pixelSize: 16
                font.bold: true
                Layout.fillWidth: true
            }

            Label {
                id: statusText
                text: ""
                color: "#888888"
                font.pixelSize: 12
            }

            Button {
                text: "実行"
                onClicked: runLinter()
                highlighted: true
            }
        }

        // タブ
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

            // === 問題タブ ===
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 4

                RowLayout {
                    Layout.fillWidth: true

                    Item { Layout.fillWidth: true }

                    Button {
                        text: "問題をコピー"
                        enabled: issuesCopyText.length > 0
                        onClicked: {
                            issuesCopyArea.selectAll();
                            issuesCopyArea.copy();
                        }
                    }
                }

                ListView {
                    id: issuesView
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    model: ListModel { id: issuesModel }
                    spacing: 2

                    delegate: Rectangle {
                        width: issuesView.width
                        height: issueContent.implicitHeight + 12
                        color: mouseArea.containsMouse ? "#e8e8e8" : (index % 2 === 0 ? "#f8f8f8" : "#ffffff")
                        radius: 3

                        MouseArea {
                            id: mouseArea
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: (model.ruleId !== "" &&
                                ((model.tick !== undefined && model.tick >= 0)
                                 || (model.measure !== undefined && model.measure > 0)))
                                ? Qt.PointingHandCursor : Qt.ArrowCursor
                            onClicked: {
                                var canJump = model.ruleId !== ""
                                    && ((model.tick !== undefined && model.tick >= 0)
                                        || (model.measure !== undefined && model.measure > 0));
                                if (canJump) {
                                    jumpToIssue({
                                        tick: model.tick,
                                        staffIdx: model.staffIdx,
                                        measure: model.measure
                                    });
                                }
                            }
                        }

                        RowLayout {
                            id: issueContent
                            anchors.fill: parent
                            anchors.margins: 6
                            spacing: 8

                            // Severity アイコン
                            Rectangle {
                                width: 8
                                height: 8
                                radius: 4
                                color: model.severity === "error" ? "#e53935" :
                                       model.severity === "warning" ? "#fb8c00" : "#43a047"
                                Layout.alignment: Qt.AlignTop
                                Layout.topMargin: 4
                            }

                            // メッセージ
                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Label {
                                    text: (model.severity || "info").toUpperCase()
                                    color: model.severity === "error" ? "#c62828" :
                                           model.severity === "warning" ? "#ef6c00" : "#2e7d32"
                                    font.bold: true
                                    font.pixelSize: 11
                                }

                                Label {
                                    text: model.message
                                    wrapMode: Text.WordWrap
                                    Layout.fillWidth: true
                                    font.pixelSize: 13
                                }

                                Label {
                                    text: model.measure > 0 ? ("小節 " + model.measure) : ""
                                    visible: model.measure > 0
                                    color: "#888888"
                                    font.pixelSize: 11
                                }
                            }
                        }
                    }

                    // 空状態
                    Label {
                        anchors.centerIn: parent
                        text: "「実行」ボタンを押してチェックを開始"
                        color: "#aaaaaa"
                        visible: issuesModel.count === 0
                        font.pixelSize: 13
                    }
                }

                TextArea {
                    id: issuesCopyArea
                    visible: false
                    text: issuesCopyText
                }
            }

            // === 設定タブ ===
            ScrollView {
                clip: true

                ColumnLayout {
                    width: parent.width
                    spacing: 4

                    Label {
                        text: "チェック項目"
                        font.pixelSize: 14
                        font.bold: true
                        Layout.bottomMargin: 8
                    }

                    Repeater {
                        model: Linter.getCheckerList().length

                        ColumnLayout {
                            property var checker: Linter.getCheckerList()[index]
                            Layout.fillWidth: true
                            spacing: 1

                            CheckBox {
                                text: parent.checker.name
                                checked: enabledRules[parent.checker.id] !== false
                                Layout.fillWidth: true
                                onToggled: {
                                    var rules = enabledRules;
                                    rules[parent.checker.id] = checked;
                                    enabledRules = rules;
                                    // Settings に永続化
                                    if (parent.checker.id === "pizz-arco") persistedSettings.rulePizzArco = checked;
                                    else if (parent.checker.id === "sordino") persistedSettings.ruleSordino = checked;
                                    else if (parent.checker.id === "solo-tutti") persistedSettings.ruleSoloTutti = checked;
                                    else if (parent.checker.id === "div-unis") persistedSettings.ruleDivUnis = checked;
                                    else if (parent.checker.id === "rest-annotation") persistedSettings.ruleRestAnnotation = checked;
                                    else if (parent.checker.id === "tempo-barline") persistedSettings.ruleTempoBarline = checked;
                                    else if (parent.checker.id === "opening-tempo") persistedSettings.ruleOpeningTempo = checked;
                                    else if (parent.checker.id === "first-note-dynamics") persistedSettings.ruleFirstNoteDynamics = checked;
                                }
                            }

                            Label {
                                text: parent.checker.description || ""
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

            // === スナップショットタブ ===
            ColumnLayout {
                spacing: 4

                RowLayout {
                    Layout.fillWidth: true

                    Label {
                        text: "スナップショット（実行結果のJSON）"
                        font.pixelSize: 14
                        font.bold: true
                        Layout.fillWidth: true
                    }

                    Button {
                        text: "コピー"
                        enabled: snapshotText.length > 0
                        onClicked: {
                            snapshotArea.selectAll();
                            snapshotArea.copy();
                        }
                    }
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true

                    TextArea {
                        id: snapshotArea
                        text: snapshotText || "「実行」ボタンを押すとスナップショットが表示されます"
                        readOnly: true
                        selectByMouse: true
                        wrapMode: TextArea.Wrap
                        font.family: "monospace"
                        font.pixelSize: 11
                    }
                }
            }
        }
    }
}
