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
    readonly property string repoSlug: "kjfsm/musescore-linter-plugin"
    readonly property string releasesPageUrl: "https://github.com/" + repoSlug + "/releases/latest"
    readonly property string latestZipUrl: "https://github.com/" + repoSlug + "/releases/latest/download/musescore-linter-plugin.zip"

    property var enabledRules: ({})
    // ruleId → { key: 値 }。checker の options 宣言から解決した値を持つ。
    property var ruleOptions: ({})
    property var issuesList: []
    property var checkerList: []
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
    // events が出力の 6 割弱を占めるため、そこだけ分割して Timer で回し、タブを離れたら
    // 途中で中断できるようにしている。残りの index/meta/registry/derived は合わせても
    // 小さいので最後に一括で作る。
    readonly property int snapshotChunkSize: 1000
    property var snapshotIR: null
    property bool snapshotBuilding: false
    property int snapshotDone: 0
    property int snapshotTotal: 0
    property int snapshotBuildMs: 0
    property var snapshotChunks: []
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
        property string rulesJson: "{}"
        // checker 個別の設定は rulesJson に混ぜない。loadEnabledRules が全値を !! で
        // 真偽値に潰すため、同じ袋に入れると配列や文字列の設定が壊れる。
        property string ruleOptionsJson: "{}"
        property bool perfEnabled: false
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
        loadRuleOptions();
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
            // 有効判定は Bundle 側（core）に一本化してある
            rules[c.id] = Bundle.isCheckerEnabled(c, persisted);
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

    // 保存済みの値を checker の options 宣言に沿って解決する。未知の checker/key や
    // 不正な値は Bundle 側（resolveCheckerOptions）が既定へ落としてくれる。
    function loadRuleOptions() {
        var persisted = {};
        try {
            persisted = JSON.parse(persistedSettings.ruleOptionsJson || "{}") || {};
        } catch (e) {
            console.warn("[ScoreLinter] ruleOptionsJson パース失敗、初期状態で復元: " + e);
            persisted = {};
        }
        var out = {};
        for (var i = 0; i < checkerList.length; i++) {
            var c = checkerList[i];
            if (!c.options || c.options.length === 0) continue;
            out[c.id] = Bundle.resolveCheckerOptions(c.options, persisted[c.id]);
        }
        ruleOptions = out;
    }

    function setRuleOption(ruleId, key, value) {
        var next = {};
        for (var k in ruleOptions) if (ruleOptions.hasOwnProperty(k)) next[k] = ruleOptions[k];
        var forRule = {};
        if (next[ruleId]) {
            for (var j in next[ruleId]) {
                if (next[ruleId].hasOwnProperty(j)) forRule[j] = next[ruleId][j];
            }
        }
        forRule[key] = value;
        next[ruleId] = forRule;
        ruleOptions = next;
        persistedSettings.ruleOptionsJson = JSON.stringify(next);
    }

    function runLinter() {
        var tStart = Date.now();

        // 前回の LintIR と JSON を先に手放してから走査する。QJSEngine は巨大なオブジェクト
        // グラフが 2 つ生きているとチェッカー実行中に GC が繰り返し走り、実測で 2 回目以降が
        // 7 倍遅くなった（701 ms → 5143 ms）。参照を切るだけでは回収の時機を選べないので、
        // 使えるなら明示的に走らせる。
        cancelSnapshotBuild();
        snapshotText = "";
        snapshotIR = null;
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
            // 内訳の集計は bundle 側（core/perf.ts）で行う。false のときは計時も記録もしない。
            Bundle.setPerfEnabled(persistedSettings.perfEnabled);

            // `NoteType` / `BarLineType` は MuseScore オブジェクトのプロパティ（実行時に値を解決する
            // enum）。値を焼き込まず、実行時の enum を hostEnums として渡す。`plugin`（このルート
            // オブジェクト自身）も渡すと、型の生成元 MuseScore バージョンとの照合・実行時 enum の
            // 未知メンバ検出（strictEnum）を Bundle 側（SDK ヘルパ）が行い、結果を
            // snapshot.meta.hostVersion に記録する。
            var hostEnums = { noteType: NoteType, barLineType: BarLineType, bracketType: BracketType };

            var tSnapshot = Date.now();
            var snapshot = Bundle.buildSnapshot(curScore, hostEnums, plugin);
            var msSnapshot = Date.now() - tSnapshot;

            // JSON 化はここでは行わない。スナップショットタブを開いたときに初めて作る。
            snapshotIR = snapshot;

            var issues = [];
            var hv = snapshot.meta && snapshot.meta.hostVersion;
            if (hv && !hv.ok) {
                issues.push(internalWarning(hv.message));
            }

            var tCheckers = Date.now();
            issuesList = issues.concat(Bundle.runAllCheckers(snapshot, enabledRules, ruleOptions));
            var msCheckers = Date.now() - tCheckers;

            hasRun = true;
            elapsedMs = Date.now() - tStart;

            if (persistedSettings.perfEnabled) {
                perfText = buildPerfText(msGc, msSnapshot, msCheckers);
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

    function buildPerfText(msGc, msSnapshot, msCheckers) {
        // ラベルは桁を揃えるため ASCII のみ（monospace 表示なので全角が混ざるとずれる）
        var lines = [
            "[ScoreLinter:runLinter]",
            "  total           " + elapsedMs  + " ms",
            "  gc              " + msGc       + " ms",
            "  buildSnapshot   " + msSnapshot + " ms",
            "  runAllCheckers  " + msCheckers + " ms"
        ];
        var reports = ["getSnapshotPerfReport", "getCheckerPerfReport"];
        for (var i = 0; i < reports.length; i++) {
            var detail = "";
            try {
                detail = Bundle[reports[i]]();
            } catch (e) {
                console.warn("[ScoreLinter] " + reports[i] + " の取得に失敗: " + e);
            }
            if (detail && detail.length > 0) {
                lines.push("");
                lines.push(detail);
            }
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
        if (snapshotBuilding || snapshotText.length > 0 || !snapshotIR) return;

        snapshotChunks = [];
        snapshotDone = 0;
        snapshotTotal = snapshotIR.events ? snapshotIR.events.length : 0;
        snapshotStartedAt = Date.now();
        snapshotBuilding = true;
        snapshotTimer.start();
    }

    function cancelSnapshotBuild() {
        if (!snapshotBuilding) return;
        snapshotTimer.stop();
        snapshotBuilding = false;
        snapshotChunks = [];
        snapshotDone = 0;
        snapshotTotal = 0;
    }

    function buildSnapshotChunk() {
        if (!snapshotIR || !snapshotIR.events) {
            cancelSnapshotBuild();
            return;
        }
        try {
            var events = snapshotIR.events;
            var end = Math.min(snapshotDone + snapshotChunkSize, snapshotTotal);
            var buf = [];
            // 1 イベント 1 行。インデント付きで丸ごと stringify するより速く、行単位で
            // 追いやすい。JSON としては同じ。
            for (var i = snapshotDone; i < end; i++) {
                buf.push("    " + JSON.stringify(events[i]));
            }
            snapshotChunks.push(buf.join(",\n"));
            snapshotDone = end;

            if (snapshotDone >= snapshotTotal) finishSnapshotBuild();
        } catch (e) {
            console.error("[ScoreLinter] スナップショット生成に失敗: " + e);
            cancelSnapshotBuild();
            snapshotText = "スナップショットの生成に失敗しました: " + e;
        }
    }

    function finishSnapshotBuild() {
        snapshotTimer.stop();

        var out = ['{\n  "events": [\n', snapshotChunks.join(",\n"), "\n  ]"];
        var keys = ["index", "meta", "registry", "derived"];
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (snapshotIR[k] === undefined) continue;
            // events より 1 段浅い位置に出るのでインデントを足して揃える。文字列値の中の
            // 改行は stringify が \\n へエスケープするので、生の \n は構造由来だけ。
            var body = JSON.stringify(snapshotIR[k], null, 2).split("\n").join("\n  ");
            out.push(',\n  "' + k + '": ' + body);
        }
        out.push("\n}");

        snapshotText = out.join("");
        snapshotChunks = [];
        snapshotBuilding = false;
        snapshotBuildMs = Date.now() - snapshotStartedAt;
        console.log("[ScoreLinter] スナップショット生成: " + snapshotBuildMs + " ms");
    }

    // Bundle.setPerfEnabled（bundle 側の計測フラグ）と紛らわしくないよう名前を分けている。
    function setPerfLogging(checked) {
        persistedSettings.perfEnabled = checked;
        if (!checked) perfText = "";
    }

    function internalIssue(msg) {
        return {
            ruleId: "internal", severity: "error", category: "internal",
            message: msg, partName: "", staffIdx: -1, measure: 0, tick: 0, detail: null
        };
    }

    function internalWarning(msg) {
        return {
            ruleId: "internal-version-mismatch", severity: "warning", category: "internal",
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

    // パート絞り込み用のパート一覧。snapshotIR から直接読む。
    //
    // 以前は snapshotText（スナップショットタブを開いたときだけ組み立てられる巨大な
    // JSON 文字列）を JSON.parse し直していた。そのため
    //   - タブを開くまでは絞り込みが常に空
    //   - 開いたあとはバインディングが再評価されるたびに数 MB のパースが UI スレッドで走る
    // という二重の問題があった。snapshotIR は runLinter の時点で手元にあるので、
    // 文字列化を経由する理由がない。
    function parts() {
        if (snapshotIR && snapshotIR.meta && snapshotIR.meta.parts) return snapshotIR.meta.parts;
        return [];
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
            req.setRequestHeader("User-Agent", "musescore-linter-plugin");
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
                        hasSnapshot: plugin.snapshotIR !== null
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
