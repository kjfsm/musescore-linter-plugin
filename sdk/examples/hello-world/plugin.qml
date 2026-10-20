import QtQuick 2.15
import MuseScore 3.0

import "logic.js" as Logic

MuseScore {
  id: mscore
  menuPath: "Plugins.Hello World"
  title: "Hello World"
  version: "0.1.0"
  description: "TypeScript で書かれた最小構成の MuseScore 4 プラグイン。"
  pluginType: "dock"
  requiresScore: false

  onRun: {
    // ホスト（この MuseScore オブジェクト自身）を丸ごと渡す。curScore も全 enum も
    // メソッドも、実行中の版から型付きで TS 側に渡る。
    Logic.run(mscore)
  }
}
