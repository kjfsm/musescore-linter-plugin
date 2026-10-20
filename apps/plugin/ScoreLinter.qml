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
    version: "__PLUGIN_VERSION__"
    pluginType: "dialog"
    width: 720
    height: 680

    // バージョンは build 時に package.json から注入される（単一情報源）
    readonly property string pluginVersion: "__PLUGIN_VERSION__"
    // アップデート確認用 GitHub リポジトリ
    readonly property string repoSlug: "kjfsm/score-linter"
    readonly property string releasesPageUrl: "https://github.com/" + repoSlug + "/releases/latest"
    readonly property string latestZipUrl: "https://github.com/" + repoSlug + "/releases/latest/download/score-linter.zip"

    // 既定値から変えた分だけを持つ設定。保存もこの形で行う（Bundle.serializeSettings）。
    property var settings: ({ enabled: {}, options: {} })
    // 設定画面に出す値。settings から Bundle.settingsView で作る。
    property var enabledRules: ({})
    property var ruleOptions: ({})
    property var issuesList: []
    property var checkerList: []
    property var ruleGroupList: []
    // 直近の Bundle.lintCurrentScore の結果。ジャンプ・スナップショット・パートの絞り込みに使う。
    property var lastRun: null
    property string snapshotText: ""
    property bool hasRun: false

    // ─── 実行時間の計測 ───
    // 全体の所要時間は常に記録してヘッダに表示する（Date.now() 2 回分でコストは無視できる）。
    // 内訳は perfEnabled が true のときだけ集計し、スナップショットタブに出す。
    property int elapsedMs: 0
    property string perfText: ""

    // ─── スナップショット JSON の遅延生成 ───
    // JSON.stringify は QJSEngine だと実測で 5 秒超かかる（V8 の約 100 倍）。実行のたびに
    // 走らせると全体の 6 割を占めるので、スナップショットタブを開いたときだけ生成する。
    // Bundle.createSnapshotWriter が要素ごとに分けて書くので、Timer で少しずつ進め、
    // タブを離れたら途中で止める。
    readonly property int snapshotChunkSize: 1000
    property bool snapshotBuilding: false
    property int snapshotDone: 0
    property int snapshotTotal: 0
    property int snapshotBuildMs: 0
    property var snapshotWriter: null
    property double snapshotStartedAt: 0

    // タブの出入りで生成の開始・中断を切り替える（2 = スナップショットタブ）
    property int currentTab: tabBar.currentIndex
    onCurrentTabChanged: {
        if (currentTab === 2) startSnapshotBuild();
        else cancelSnapshotBuild();
    }

    // ─── アップデート確認の状態 ───
    // idle / checking / upToDate / available / error
    property string updateState: "idle"
    property string latestVersion: ""
    property string updateMessage: ""

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
        // 中身は Bundle.serializeSettings が作る、既定値から変えた分だけの JSON
        property string rulesJson: "{}"
        property string ruleOptionsJson: "{}"
        property bool perfEnabled: false
    }

    onRun: {
        initialize();
    }

    function initialize() {
        try {
            ruleGroupList = Bundle.ruleCatalog();
            var all = [];
            for (var i = 0; i < ruleGroupList.length; i++) all = all.concat(ruleGroupList[i].rules);
            checkerList = all;
            // 壊れた保存値・未知のルールは Bundle 側が捨てて既定値に戻す
            applySettings(Bundle.loadSettings(persistedSettings.rulesJson, persistedSettings.ruleOptionsJson), false);
        } catch (e) {
            console.error("[ScoreLinter] ルールの取得に失敗: " + e);
            checkerList = [];
            ruleGroupList = [];
        }
    }

    function applySettings(next, persist) {
        settings = next;
        var view = Bundle.settingsView(next);
        enabledRules = view.enabled;
        ruleOptions = view.options;
        if (!persist) return;
        var saved = Bundle.serializeSettings(next);
        persistedSettings.rulesJson = saved.enabled;
        persistedSettings.ruleOptionsJson = saved.options;
    }

    function setRuleEnabled(ruleId, checked) {
        applySettings(Bundle.setRuleEnabled(settings, ruleId, checked), true);
    }

    function setRuleOption(ruleId, key, value) {
        applySettings(Bundle.setRuleOption(settings, ruleId, key, value), true);
    }

    function runLinter() {
        var tStart = Date.now();

        // 前回の結果と JSON を先に手放してから走査する。QJSEngine は巨大なオブジェクト
        // グラフが 2 つ生きているとチェッカー実行中に GC が繰り返し走り、実測で 2 回目以降が
        // 7 倍遅くなった（701 ms → 5143 ms）。参照を切るだけでは回収の時機を選べないので、
        // 使えるなら明示的に走らせる。
        cancelSnapshotBuild();
        snapshotText = "";
        lastRun = null;
        snapshotBuildMs = 0;
        perfText = "";

        var msGc = 0;
        if (typeof gc === "function") {
            var tGc = Date.now();
            gc();
            msGc = Date.now() - tGc;
        }

        if (!curScore) {
            issuesList = [internalIssue("スコアが開かれていません")];
            hasRun = true;
            elapsedMs = Date.now() - tStart;
            tabBar.currentIndex = 0;
            return;
        }

        try {
            // `plugin`（このルートオブジェクト）を渡すと、Bundle 側が実行中の MuseScore の enum
            // （NoteType・BarLineType など）に結び付けて読む。値を焼き込まないので版の差に強い。
            // スナップショットの JSON はここでは作らず、タブを開いたときに初めて作る。
            var tLint = Date.now();
            var run = Bundle.lintCurrentScore(plugin, settings, persistedSettings.perfEnabled);
            var msLint = Date.now() - tLint;
            lastRun = run;

            var issues = [];
            if (run.warning) issues.push(internalWarning(run.warning));
            issuesList = issues.concat(run.issues);

            hasRun = true;
            elapsedMs = Date.now() - tStart;

            if (persistedSettings.perfEnabled) {
                perfText = buildPerfText(msGc, msLint, run.perfText);
                console.log(perfText);
            }
            tabBar.currentIndex = 0;
        } catch (e) {
            console.error("[ScoreLinter] runLinter 失敗: " + e);
            issuesList = [internalIssue("実行中にエラーが発生しました: " + e)];
            hasRun = true;
            elapsedMs = Date.now() - tStart;
        }
    }

    function buildPerfText(msGc, msLint, detail) {
        // ラベルは桁を揃えるため ASCII のみ（monospace 表示なので全角が混ざるとずれる）
        var lines = [
            "[ScoreLinter:runLinter]",
            "  total             " + elapsedMs + " ms",
            "  gc                " + msGc      + " ms",
            "  lintCurrentScore  " + msLint    + " ms"
        ];
        if (detail && detail.length > 0) {
            lines.push("");
            lines.push(detail);
        }
        return lines.join("\n");
    }

    // ─── スナップショット JSON の分割生成 ───

    Timer {
        id: snapshotTimer
        interval: 1
        repeat: true
        onTriggered: buildSnapshotChunk()
    }

    function startSnapshotBuild() {
        // 生成済み・生成中・未実行のいずれでもないときだけ着手する
        if (snapshotBuilding || snapshotText.length > 0 || !lastRun) return;

        snapshotWriter = Bundle.createSnapshotWriter(lastRun.score);
        snapshotDone = 0;
        snapshotTotal = snapshotWriter.total;
        snapshotStartedAt = Date.now();
        snapshotBuilding = true;
        snapshotTimer.start();
    }

    function cancelSnapshotBuild() {
        if (!snapshotBuilding) return;
        snapshotTimer.stop();
        snapshotBuilding = false;
        snapshotWriter = null;
        snapshotDone = 0;
        snapshotTotal = 0;
    }

    function buildSnapshotChunk() {
        if (!snapshotWriter) {
            cancelSnapshotBuild();
            return;
        }
        try {
            var finished = snapshotWriter.step(snapshotChunkSize);
            snapshotDone = snapshotWriter.done;
            if (finished) finishSnapshotBuild();
        } catch (e) {
            console.error("[ScoreLinter] スナップショット生成に失敗: " + e);
            cancelSnapshotBuild();
            snapshotText = "スナップショットの生成に失敗しました: " + e;
        }
    }

    function finishSnapshotBuild() {
        snapshotTimer.stop();
        snapshotText = snapshotWriter.text();
        snapshotWriter = null;
        snapshotBuilding = false;
        snapshotBuildMs = Date.now() - snapshotStartedAt;
        console.log("[ScoreLinter] スナップショット生成: " + snapshotBuildMs + " ms");
    }

    function setPerfLogging(checked) {
        persistedSettings.perfEnabled = checked;
        if (!checked) perfText = "";
    }

    function internalIssue(msg) {
        return {
            ruleId: "internal", severity: "error", category: "internal", message: msg,
            partId: null, partName: "", staffIdx: -1, measure: 0, measureLabel: "", tick: 0, detail: null
        };
    }

    function internalWarning(msg) {
        return {
            ruleId: "internal-version-mismatch", severity: "warning", category: "internal", message: msg,
            partId: null, partName: "", staffIdx: -1, measure: 0, measureLabel: "", tick: 0, detail: null
        };
    }

    function jumpToIssue(issue) {
        if (!curScore || !lastRun || !issue) return;
        // 範囲は読み込んだときに覚えた小節の tick から作る（Bundle.selectionFor）
        var range = Bundle.selectionFor(lastRun, issue);
        if (!range) return;

        curScore.startCmd();
        curScore.selection.selectRange(range.startTick, range.endTick, range.staff, range.staff + 1);
        curScore.endCmd();
    }

    function copyToClipboard(text) {
        if (!text || text.length === 0) return;
        clipboardHelper.text = text;
        clipboardHelper.selectAll();
        clipboardHelper.copy();
        clipboardHelper.deselect();
    }

    // パートの絞り込みに出すパート名。スナップショットの JSON を読み直さず、結果から直接引く。
    function parts() {
        return lastRun ? lastRun.partNames : [];
    }

    // ─── アップデート確認 ───────────────────────────────────────────────────
    // GitHub Releases API から最新版を取得し、現在版と比較する。
    // 比較ロジックは bundle 側（Bundle.isNewerVersion）に集約してテスト可能にしている。
    // UI 層なのでネットワーク/parse 失敗は握りつぶしてエラー表示に倒す（never-catch は Checker 内限定）。
    function checkForUpdate() {
        updateState = "checking";
        updateMessage = "";
        latestVersion = "";

        var req = new XMLHttpRequest();
        var url = "https://api.github.com/repos/" + repoSlug + "/releases/latest";
        try {
            req.open("GET", url, true);
            req.setRequestHeader("Accept", "application/vnd.github+json");
            // GitHub API は User-Agent 必須
            req.setRequestHeader("User-Agent", "score-linter");
            req.onreadystatechange = function() {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                try {
                    if (req.status !== 200) {
                        plugin.updateState = "error";
                        plugin.updateMessage = "更新を確認できませんでした (HTTP " + req.status + ")。時間をおいて再度お試しください。";
                        return;
                    }
                    var data = JSON.parse(req.responseText);
                    var tag = (data && data.tag_name) ? String(data.tag_name) : "";
                    if (tag.length === 0) {
                        plugin.updateState = "error";
                        plugin.updateMessage = "最新バージョン情報を取得できませんでした。";
                        return;
                    }
                    plugin.latestVersion = tag;
                    if (Bundle.isNewerVersion(plugin.pluginVersion, tag)) {
                        plugin.updateState = "available";
                    } else {
                        plugin.updateState = "upToDate";
                    }
                } catch (e) {
                    plugin.updateState = "error";
                    plugin.updateMessage = "応答の解析に失敗しました。";
                    console.warn("[ScoreLinter] update parse 失敗: " + e);
                }
            };
            req.send();
        } catch (e) {
            updateState = "error";
            updateMessage = "更新を確認できませんでした。ネットワーク接続を確認してください。";
            console.warn("[ScoreLinter] checkForUpdate 失敗: " + e);
        }
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

                    // バージョン / ビルド日時
                    Label {
                        text: "v" + plugin.pluginVersion + "  ·  __BUILD_DATE__"
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

                    // 実行時間（最適化の前後比較に使うので秒に丸めず ms のまま出す）
                    Label {
                        visible: hasRun
                        text: plugin.elapsedMs + " ms"
                        font.pixelSize: 10
                        color: "#9E9E9E"
                        Layout.alignment: Qt.AlignVCenter
                    }

                    Item { Layout.fillWidth: true }

                    // アップデート確認ボタン
                    Button {
                        text: plugin.updateState === "checking" ? "確認中…" : "アップデート確認"
                        font.pixelSize: 12
                        enabled: plugin.updateState !== "checking"
                        implicitHeight: 34
                        onClicked: plugin.checkForUpdate()
                        background: Rectangle {
                            color: parent.enabled ? (parent.hovered ? "#EEEEEE" : "#F5F5F5") : "#FAFAFA"
                            border.color: "#E0E0E0"
                            border.width: 1
                            radius: 6
                        }
                        contentItem: Text {
                            text: parent.text
                            font: parent.font
                            color: parent.enabled ? "#424242" : "#BDBDBD"
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                            leftPadding: 8
                            rightPadding: 8
                        }
                    }

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

            // ─── アップデート通知バナー ───
            UpdateBanner {
                Layout.fillWidth: true
                updateState: plugin.updateState
                currentVersion: plugin.pluginVersion
                latestVersion: plugin.latestVersion
                errorMessage: plugin.updateMessage
                onDownloadRequested: Qt.openUrlExternally(plugin.latestZipUrl)
                onReleasePageRequested: Qt.openUrlExternally(plugin.releasesPageUrl)
                onOpenFolderRequested: Qt.openUrlExternally(Qt.resolvedUrl("."))
                onDismissRequested: plugin.updateState = "idle"
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
                            onCopyRequested: plugin.copyToClipboard(Bundle.formatForCopy(issues, format))
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
                        groups: plugin.ruleGroupList
                        enabledRules: plugin.enabledRules
                        ruleOptions: plugin.ruleOptions
                        perfEnabled: persistedSettings.perfEnabled
                        onRuleToggled: plugin.setRuleEnabled(ruleId, checked)
                        onRuleOptionChanged: plugin.setRuleOption(ruleId, key, value)
                        onPerfToggled: plugin.setPerfLogging(checked)
                    }
                }

                // スナップショットタブ
                Item {
                    SnapshotPanel {
                        anchors.fill: parent
                        anchors.margins: 10
                        snapshotText: plugin.snapshotText
                        perfText: plugin.perfText
                        building: plugin.snapshotBuilding
                        buildDone: plugin.snapshotDone
                        buildTotal: plugin.snapshotTotal
                        buildMs: plugin.snapshotBuildMs
                        hasSnapshot: plugin.lastRun !== null
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
