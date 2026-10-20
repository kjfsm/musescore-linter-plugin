import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: root
    spacing: 4

    property string snapshotText: ""
    property string perfText: ""

    // JSON はこのタブを開いたときに分割生成される（ScoreLinter.qml 側で駆動）
    property bool building: false
    property int buildDone: 0
    property int buildTotal: 0
    property int buildMs: 0
    property bool hasSnapshot: false

    signal copyRequested(string text)

    RowLayout {
        Layout.fillWidth: true

        Label {
            text: "スナップショット（LintIR の JSON）"
            font.pixelSize: 14
            font.bold: true
            Layout.fillWidth: true
        }

        Button {
            text: "時間をコピー"
            enabled: root.perfText.length > 0
            onClicked: root.copyRequested(root.perfText)
        }

        Button {
            text: "JSON をコピー"
            enabled: root.snapshotText.length > 0
            onClicked: root.copyRequested(root.snapshotText)
        }
    }

    Label {
        text: {
            var base = "チェッカーをデバッグしたり fixture として保存する際に利用してください。";
            if (root.buildMs > 0) return base + "（生成 " + root.buildMs + " ms）";
            return base;
        }
        color: "#777777"
        font.pixelSize: 11
        Layout.fillWidth: true
        wrapMode: Text.WordWrap
    }

    // 実行時間の内訳（設定タブで計測を有効にしたときのみ）。
    // 数字を拾えるよう TextArea にして選択可能にしている。checker ごとの行が増えると
    // 縦に伸びて JSON 欄を潰すので、高さを頭打ちにして中をスクロールさせる。
    Rectangle {
        readonly property int maxHeight: 200

        visible: root.perfText.length > 0
        Layout.fillWidth: true
        Layout.topMargin: 4
        Layout.preferredHeight: Math.min(perfArea.implicitHeight + 8, maxHeight)
        color: "#FAFAFA"
        border.color: "#E0E0E0"
        border.width: 1
        radius: 4

        ScrollView {
            anchors.fill: parent
            anchors.margins: 4
            clip: true

            TextArea {
                id: perfArea
                text: root.perfText
                readOnly: true
                selectByMouse: true
                wrapMode: TextArea.NoWrap
                color: "#424242"
                font.family: "monospace"
                font.pixelSize: 11
                background: null
            }
        }
    }

    // 生成中の表示。JSON 化は QJSEngine だと数秒かかるので分割して進捗を出す。
    ColumnLayout {
        visible: root.building
        Layout.fillWidth: true
        Layout.fillHeight: true
        Layout.topMargin: 12
        spacing: 8

        Label {
            text: "スナップショットを生成中… " + root.buildDone + " / " + root.buildTotal
            font.pixelSize: 12
            color: "#424242"
        }

        ProgressBar {
            Layout.fillWidth: true
            from: 0
            to: root.buildTotal > 0 ? root.buildTotal : 1
            value: root.buildDone
        }

        Label {
            text: "他のタブに切り替えると中断します。"
            color: "#9E9E9E"
            font.pixelSize: 11
        }

        Item { Layout.fillHeight: true }
    }

    ScrollView {
        visible: !root.building
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true

        TextArea {
            id: snapshotArea
            text: {
                if (root.snapshotText.length > 0) return root.snapshotText;
                if (root.hasSnapshot) return "生成を中断しました。このタブをもう一度開くと再開します。";
                return "「実行」ボタンを押すとスナップショットが表示されます";
            }
            readOnly: true
            selectByMouse: true
            wrapMode: TextArea.Wrap
            font.family: "monospace"
            font.pixelSize: 11
        }
    }
}
