import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

// アップデート確認結果を表示する純表示コンポーネント。
// 状態は updateState（idle / checking / upToDate / available / error）を props で受け取り、
// 実際のネットワーク処理・URL 起動は親（ScoreLinter.qml）が signal で受けて行う。
Rectangle {
    id: banner

    property string updateState: "idle"
    property string currentVersion: ""
    property string latestVersion: ""
    property string errorMessage: ""

    signal downloadRequested()
    signal releasePageRequested()
    signal openFolderRequested()
    signal dismissRequested()

    readonly property bool available: updateState === "available"

    visible: updateState !== "idle"
    implicitHeight: visible ? row.implicitHeight + 16 : 0
    color: {
        if (available) return "#E3F2FD";
        if (updateState === "error") return "#FFF3E0";
        return "#F5F5F5";
    }

    // 下線
    Rectangle {
        anchors.bottom: parent.bottom
        width: parent.width; height: 1
        color: available ? "#90CAF9" : "#E0E0E0"
    }

    RowLayout {
        id: row
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 12
        anchors.topMargin: 8
        anchors.bottomMargin: 8
        spacing: 10

        // 状態アイコン
        Label {
            text: {
                if (banner.available) return "🆕";
                if (banner.updateState === "checking") return "⏳";
                if (banner.updateState === "error") return "⚠️";
                return "✓";
            }
            font.pixelSize: 14
            Layout.alignment: Qt.AlignVCenter
        }

        // メッセージ
        Label {
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            font.pixelSize: 12
            color: "#424242"
            text: {
                if (banner.updateState === "checking")
                    return "最新バージョンを確認しています…";
                if (banner.updateState === "upToDate")
                    return "最新版を使用しています (v" + banner.currentVersion + ")";
                if (banner.updateState === "error")
                    return banner.errorMessage.length > 0
                        ? banner.errorMessage
                        : "更新を確認できませんでした。";
                if (banner.available)
                    return "新しいバージョン " + banner.latestVersion
                        + " が利用可能です（現在 v" + banner.currentVersion
                        + "）。ZIP を展開し、開いたフォルダの中身を置き換えて MuseScore を再起動してください。";
                return "";
            }
        }

        // ─── available 時のアクションボタン ───
        Button {
            visible: banner.available
            text: "ZIP をダウンロード"
            font.pixelSize: 12
            font.bold: true
            implicitHeight: 30
            onClicked: banner.downloadRequested()
            background: Rectangle {
                color: parent.pressed ? "#1565C0" : (parent.hovered ? "#1976D2" : "#2196F3")
                radius: 6
            }
            contentItem: Text {
                text: parent.text
                font: parent.font
                color: "white"
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                leftPadding: 8
                rightPadding: 8
            }
        }

        Button {
            visible: banner.available
            text: "プラグインフォルダを開く"
            font.pixelSize: 12
            implicitHeight: 30
            onClicked: banner.openFolderRequested()
            background: Rectangle {
                color: parent.hovered ? "#E3F2FD" : "#FFFFFF"
                border.color: "#90CAF9"
                border.width: 1
                radius: 6
            }
            contentItem: Text {
                text: parent.text
                font: parent.font
                color: "#1565C0"
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                leftPadding: 8
                rightPadding: 8
            }
        }

        // リリースページ（詳細）リンク
        Label {
            visible: banner.available
            text: "詳細"
            font.pixelSize: 12
            font.underline: true
            color: "#1565C0"
            Layout.alignment: Qt.AlignVCenter
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: banner.releasePageRequested()
            }
        }

        // 閉じる（available / upToDate / error で表示）
        Label {
            visible: banner.updateState !== "checking"
            text: "✕"
            font.pixelSize: 13
            color: "#9E9E9E"
            Layout.alignment: Qt.AlignVCenter
            MouseArea {
                anchors.fill: parent
                anchors.margins: -6
                cursorShape: Qt.PointingHandCursor
                onClicked: banner.dismissRequested()
            }
        }
    }
}
