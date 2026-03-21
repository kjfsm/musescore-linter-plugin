import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Qt.labs.settings 1.0
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

    Settings {
        id: persistedSettings
        category: "ScoreLinter"
        property bool rulePizzArco: true
        property bool ruleSordino: true
        property bool ruleSoloTutti: true
    }

    onRun: {
        initSettings();
    }

    function initSettings() {
        enabledRules = {
            "pizz-arco": persistedSettings.rulePizzArco,
            "sordino": persistedSettings.ruleSordino,
            "solo-tutti": persistedSettings.ruleSoloTutti
        };
    }

    function runLinter() {
        issuesModel.clear();
        issuesList = [];

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

        var snapshot = Snapshot.buildSnapshot(curScore);
        var issues = Linter.runAllCheckers(snapshot, enabledRules);
        issuesList = issues;

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
        // cmd() による小節ジャンプが最も確実にUIのスクロール・選択を反映する
        cmd("escape");
        cmd("first-element");
        for (var i = 1; i < issue.measure; i++) {
            cmd("next-measure");
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

            TabButton { text: "Issues" }
            TabButton { text: "Settings" }
        }

        // タブコンテンツ
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: tabBar.currentIndex

            // === Issues タブ ===
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
                                    staffIdx: model.staffIdx
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

            // === Settings タブ ===
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
                            }
                        }
                    }
                }
            }
        }
    }
}
