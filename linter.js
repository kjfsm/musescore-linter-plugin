.pragma library
.import "checkers/PizzArcoChecker.js" as PizzArco
.import "checkers/SordinoChecker.js" as Sordino
.import "checkers/SoloTuttiChecker.js" as SoloTutti
.import "checkers/DivisiChecker.js" as Divisi
.import "checkers/RestAnnotationChecker.js" as RestAnnotation
.import "checkers/TempoBarlineChecker.js" as TempoBarline

var allCheckers = [
    PizzArco.checker,
    Sordino.checker,
    SoloTutti.checker,
    Divisi.checker,
    RestAnnotation.checker,
    TempoBarline.checker
];

function getCheckerList() {
    return allCheckers;
}

function runAllCheckers(snapshot, enabledRules) {
    var allIssues = [];
    for (var i = 0; i < allCheckers.length; i++) {
        var checker = allCheckers[i];
        if (enabledRules[checker.id] !== false) {
            var issues = checker.run(snapshot);
            console.log("[ScoreLinter] checker '" + checker.id + "': " + issues.length + " 件検出");
            for (var j = 0; j < issues.length; j++) {
                allIssues.push(issues[j]);
            }
        }
    }
    // ソート: severity (error > warning), 次に measure
    allIssues.sort(function(a, b) {
        if (a.severity !== b.severity) {
            return a.severity === "error" ? -1 : 1;
        }
        if (a.staffIdx !== b.staffIdx) return a.staffIdx - b.staffIdx;
        return a.measure - b.measure;
    });
    return allIssues;
}
