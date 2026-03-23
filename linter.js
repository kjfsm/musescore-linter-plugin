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

function ensureDerived(ir) {
    if (!ir) return;
    if (ir.derived && ir.derived._eventsCount === ir.events.length) return;

    var canonical = ir.registry && ir.registry.canonical ? ir.registry.canonical : null;
    var derived = {
        _eventsCount: ir.events.length,
        firstChordByStaff: {},
        annotationIdsByTick: {},
        unresolvedAnnotationIdsByTick: {}
    };

    if (canonical) {
        var chordIds = (ir.index && ir.index.byKind && ir.index.byKind[canonical.elementKinds.CHORD]) || [];
        for (var i = 0; i < chordIds.length; i++) {
            var chordEv = ir.events[chordIds[i]];
            var key = chordEv.staffIdx;
            if (key < 0) continue;
            var existing = derived.firstChordByStaff[key];
            if (!existing
                || chordEv.tick < existing.tick
                || (chordEv.tick === existing.tick && chordEv.measure < existing.measure)) {
                derived.firstChordByStaff[key] = {
                    tick: chordEv.tick,
                    measure: chordEv.measure
                };
            }
        }
    }

    var unresolved = ir.unresolvedAnnotations || [];
    for (var u = 0; u < unresolved.length; u++) {
        var unresolvedEv = unresolved[u];
        if (derived.unresolvedAnnotationIdsByTick[unresolvedEv.tick] === undefined) {
            derived.unresolvedAnnotationIdsByTick[unresolvedEv.tick] = [];
        }
        derived.unresolvedAnnotationIdsByTick[unresolvedEv.tick].push(u);
    }

    if (ir.index && ir.index.byTick) {
        for (var tick in ir.index.byTick) {
            if (!ir.index.byTick.hasOwnProperty(tick)) continue;
            var ids = ir.index.byTick[tick];
            var annotationIds = [];
            for (var j = 0; j < ids.length; j++) {
                var ev = ir.events[ids[j]];
                if (ev.type === "text" || ev.kind === (canonical && canonical.elementKinds.DYNAMIC)) {
                    annotationIds.push(ids[j]);
                }
            }
            if (annotationIds.length > 0) {
                derived.annotationIdsByTick[tick] = annotationIds;
            }
        }
    }

    ir.derived = derived;
}

function runAllCheckers(ir, enabledRules) {
    ensureDerived(ir);
    var allIssues = [];
    for (var i = 0; i < allCheckers.length; i++) {
        var checker = allCheckers[i];
        if (enabledRules[checker.id] !== false) {
            var issues = checker.run(ir);
            console.log("[ScoreLinter] checker '" + checker.id + "': " + issues.length + " 件検出");
            for (var j = 0; j < issues.length; j++) {
                allIssues.push(issues[j]);
            }
        }
    }
    // ソート: 小節順 → パート順（上から）→ severity (error > warning > info)
    allIssues.sort(function(a, b) {
        if (a.measure !== b.measure) return a.measure - b.measure;
        if (a.staffIdx !== b.staffIdx) return a.staffIdx - b.staffIdx;

        var order = { error: 0, warning: 1, info: 2 };
        var av = order[a.severity] !== undefined ? order[a.severity] : 99;
        var bv = order[b.severity] !== undefined ? order[b.severity] : 99;
        if (av !== bv) return av - bv;

        return (a.tick || 0) - (b.tick || 0);
    });
    return allIssues;
}
