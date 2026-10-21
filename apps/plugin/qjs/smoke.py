"""出荷する dist/bundle.js を、MuseScore と同じ版の Qt の QJSEngine で評価する。

型（lib: ES2017）による検査は近似で、\\p{...} の正規表現のように V4 エンジンでだけ落ちるものをすり抜ける。
ここでは実際のエンジンで、duet のモックに対して lint・スナップショット・設定の読み書きを通す。

usage: python smoke.py <dist/bundle.js> <dist-qjs/mock.js>
"""

import json
import sys

from PySide6.QtCore import QCoreApplication
from PySide6.QtQml import QJSEngine

SMOKE = """
(function () {
  var settings = api.loadSettings("{}", "{}", "all");
  var host = Object.assign({}, __mock__.host, { curScore: __mock__.duetScore() });
  var view = api.runLint(host, { settings: settings, measure: true, gcMs: 0, startedAt: Date.now() });
  var session = api.createSnapshotSession();
  session.start(view.run);
  while (!session.step(50)) {}
  var snapshot = JSON.parse(session.progress().text);
  return JSON.stringify({
    issues: view.issues.length,
    failed: view.issues.filter(function (i) { return i.ruleId === "internal"; }).map(function (i) { return i.message; }),
    staves: snapshot.staves.length,
    groups: api.ruleCatalog().groups.length,
    copied: api.formatForCopy(view.issues, "markdown").length,
    saved: api.serializeSettings(api.setRuleEnabled(settings, view.issues[0].ruleId, false)).enabled
  });
})()
"""


def evaluate(engine: QJSEngine, code: str, name: str):
    result = engine.evaluate(code, name)
    if result.isError():
        line = result.property("lineNumber").toInt()
        sys.exit(f"{name}:{line}: {result.toString()}")
    return result


def main() -> None:
    bundle_path, mock_path = sys.argv[1], sys.argv[2]
    QCoreApplication([])
    engine = QJSEngine()
    engine.installExtensions(QJSEngine.Extension.ConsoleExtension)

    # `.pragma library` は QML の import でだけ通る指示で、素の QJSEngine では構文エラーになる
    bundle = open(bundle_path, encoding="utf-8").read().replace(".pragma library", "", 1)
    evaluate(engine, bundle, bundle_path)
    evaluate(engine, open(mock_path, encoding="utf-8").read(), mock_path)
    summary = json.loads(evaluate(engine, SMOKE, "smoke").toString())
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if summary["failed"]:
        sys.exit("内部エラーの指摘があります")
    if summary["issues"] == 0 or summary["staves"] == 0 or summary["groups"] == 0:
        sys.exit("lint・スナップショット・ルール一覧のどれかが空です")


main()
