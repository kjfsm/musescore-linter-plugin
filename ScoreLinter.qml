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

    Settings {
        id: persistedSettings
        category: "ScoreLinter"
        property bool rulePizzArco: true
        property bool ruleSordino: true
        property bool ruleSoloTutti: true
        property bool ruleDivUnis: true
        property bool ruleRestAnnotation: true
        property bool ruleTempoBarline: true
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
            "tempo-barline": persistedSettings.ruleTempoBarline
        };
    }

    function runLinter() {
        issuesModel.clear();
        issuesList = [];
        snapshotText = "";

        if (!curScore) {
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
            TEMPO_TEXT: Element.TEMPO_TEXT
        });
        snapshotText = JSON.stringify(snapshot, null, 2);

        var issues = Linter.runAllCheckers(snapshot, enabledRules);
        issuesList = issues;
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

    function jumpToIssue(issue) {
        if (!curScore || issue.measure <= 0) return;
        var cursor = curScore.newCursor();
        cursor.rewind(Cursor.SCORE_START);
        // 目的の小節まで移動
        for (var i = 0; i < issue.measure - 1; i++) {
            cursor.nextMeasure();
        }
        // 該当小節内のアノテーションを探して選択
        var m = cursor.measure;
        if (m) {
            for (var seg = m.firstSegment; seg; seg = seg.nextInMeasure) {
                if (seg.annotations) {
                    for (var a = 0; a < seg.annotations.length; a++) {
                        var ann = seg.annotations[a];
                        var annStaffIdx = ann.track !== undefined
                            ? Math.floor(ann.track / 4) : -1;
                        if (annStaffIdx === issue.staffIdx) {
                            curScore.selection.select(ann);
                            cmd("reset");
                            cmd("note-input");
                            cmd("note-input");
                            return;
                        }
                    }
                }
            }
        }
        // フォールバック: アノテーションが見つからない場合は小節の先頭要素を選択
        if (m && m.firstSegment) {
            var track = issue.staffIdx * 4;
            var el = m.firstSegment.elementAt(track);
            if (el) {
                curScore.selection.select(el);
                cmd("reset");
                cmd("note-input");
                cmd("note-input");
            }
        }
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
            ListView {
                id: issuesView
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
                        cursorShape: model.tick > 0 ? Qt.PointingHandCursor : Qt.ArrowCursor
                        onClicked: {
                            if (model.tick > 0 && model.ruleId !== "") {
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

                        CheckBox {
                            property var checker: Linter.getCheckerList()[index]
                            text: checker.name
                            checked: enabledRules[checker.id] !== false
                            Layout.fillWidth: true
                            onToggled: {
                                var rules = enabledRules;
                                rules[checker.id] = checked;
                                enabledRules = rules;
                                // Settings に永続化
                                if (checker.id === "pizz-arco") persistedSettings.rulePizzArco = checked;
                                else if (checker.id === "sordino") persistedSettings.ruleSordino = checked;
                                else if (checker.id === "solo-tutti") persistedSettings.ruleSoloTutti = checked;
                                else if (checker.id === "div-unis") persistedSettings.ruleDivUnis = checked;
                                else if (checker.id === "rest-annotation") persistedSettings.ruleRestAnnotation = checked;
                                else if (checker.id === "tempo-barline") persistedSettings.ruleTempoBarline = checked;
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
