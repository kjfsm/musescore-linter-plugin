.pragma library
.import "checkerRegistry.js" as Registry
.import "checkers/index.js" as Checkers
.import "issue.js" as Issue
.import "logger.js" as Logger

var log = Logger.make("linter");

function ensureRegistered() {
    Checkers.registerAll();
}

function getCheckerList() {
    ensureRegistered();
    return Registry.getAll();
}

function ensureDerived(ir) {
    if (!ir || !ir.events) return;
    if (ir.derived && ir.derived._eventsCount === ir.events.length) return;

    var canonical = ir.registry && ir.registry.canonical ? ir.registry.canonical : null;
    var derived = {
        _eventsCount: ir.events.length,
        firstChordByStaff: {},
        annotationIdsByTick: {},
        globalAnnotationIdsByTick: {}
    };

    if (canonical) {
        var chordKind = canonical.elementKinds.CHORD;
        var chordIds = (ir.index && ir.index.byKind && ir.index.byKind[chordKind]) || [];
        for (var i = 0; i < chordIds.length; i++) {
            var ev = ir.events[chordIds[i]];
            if (ev.staffIdx < 0) continue;
            var existing = derived.firstChordByStaff[ev.staffIdx];
            if (!existing
                || ev.tick < existing.tick
                || (ev.tick === existing.tick && ev.measure < existing.measure)) {
                derived.firstChordByStaff[ev.staffIdx] = { tick: ev.tick, measure: ev.measure };
            }
        }
    }

    if (ir.index && ir.index.byTick) {
        var dynamicKind = canonical ? canonical.elementKinds.DYNAMIC : null;
        for (var tick in ir.index.byTick) {
            if (!ir.index.byTick.hasOwnProperty(tick)) continue;
            var ids = ir.index.byTick[tick];
            var annotationIds = [];
            for (var j = 0; j < ids.length; j++) {
                var e = ir.events[ids[j]];
                if (e.type === "text" || (dynamicKind && e.kind === dynamicKind)) {
                    annotationIds.push(ids[j]);
                }
            }
            if (annotationIds.length > 0) derived.annotationIdsByTick[tick] = annotationIds;
        }
    }

    // global scope イベントの tick → ids
    var globalIds = (ir.index && ir.index.byStaff && ir.index.byStaff[-1]) || [];
    for (var gi = 0; gi < globalIds.length; gi++) {
        var gev = ir.events[globalIds[gi]];
        var gtick = gev.tick;
        if (!derived.globalAnnotationIdsByTick[gtick]) derived.globalAnnotationIdsByTick[gtick] = [];
        derived.globalAnnotationIdsByTick[gtick].push(gev.id);
    }

    ir.derived = derived;
}

function runAllCheckers(ir, enabledRules) {
    ensureRegistered();
    ensureDerived(ir);
    var allIssues = [];
    var checkers = Registry.getAll();

    for (var i = 0; i < checkers.length; i++) {
        var checker = checkers[i];
        var enabled = (enabledRules && enabledRules[checker.id] !== undefined)
            ? enabledRules[checker.id] !== false
            : (checker.defaultEnabled !== false);
        if (!enabled) continue;

        try {
            var issues = checker.run(ir) || [];
            log.info("'" + checker.id + "': " + issues.length + " 件検出");
            for (var j = 0; j < issues.length; j++) allIssues.push(issues[j]);
        } catch (e) {
            log.error("checker '" + checker.id + "' が失敗: " + e);
            allIssues.push({
                ruleId: "internal",
                severity: "error",
                category: "internal",
                message: "チェッカー '" + checker.id + "' の実行中にエラー: " + e,
                partName: "",
                staffIdx: -1,
                measure: 0,
                tick: 0,
                detail: null
            });
        }
    }

    allIssues.sort(Issue.compareIssues);
    return allIssues;
}
