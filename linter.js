.pragma library
.import "checkers/PizzArcoChecker.js" as PizzArco
.import "checkers/SordinoChecker.js" as Sordino
.import "checkers/SoloTuttiChecker.js" as SoloTutti
.import "checkers/DivisiChecker.js" as Divisi
.import "checkers/RestAnnotationChecker.js" as RestAnnotation
.import "checkers/TempoBarlineChecker.js" as TempoBarline
.import "checkers/OpeningTempoChecker.js" as OpeningTempo
.import "checkers/FirstNoteDynamicsChecker.js" as FirstNoteDynamics

var allCheckers = [
    PizzArco.checker,
    Sordino.checker,
    SoloTutti.checker,
    Divisi.checker,
    RestAnnotation.checker,
    TempoBarline.checker,
    OpeningTempo.checker,
    FirstNoteDynamics.checker
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
    // ソート: severity (error > warning > info), 次に measure
    allIssues.sort(function(a, b) {
        if (a.severity !== b.severity) {
            var order = { error: 0, warning: 1, info: 2 };
            var av = order[a.severity] !== undefined ? order[a.severity] : 99;
            var bv = order[b.severity] !== undefined ? order[b.severity] : 99;
            return av - bv;
        }
        if (a.staffIdx !== b.staffIdx) return a.staffIdx - b.staffIdx;
        return a.measure - b.measure;
    });
    return allIssues;
}
