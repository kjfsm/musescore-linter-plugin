.pragma library
.import "base/predicates.js" as Predicates
.import "../issue.js" as Issue

var checker = {
    id: "opening-tempo",
    name: "冒頭テンポ表記",
    description: "曲頭にテンポ表記があるかを確認（未記載は不受理）",
    category: "tempo",
    severity: "error",
    defaultEnabled: true,
    run: function(ir) {
        var issues = [];
        if (!ir.meta || !ir.meta.parts || ir.meta.parts.length === 0) return issues;

        var canonical = Predicates.getCanonical(ir);
        if (!canonical) return issues;

        var staff = ir.meta.parts[0];
        var byStaff = (ir.index.byStaffAndKind[staff.staffIdx]) || {};

        var firstMusicEvent = null;
        var chordIds = byStaff[canonical.elementKinds.CHORD] || [];
        var restIds = byStaff[canonical.elementKinds.REST] || [];
        var musicIds = chordIds.concat(restIds);
        for (var i = 0; i < musicIds.length; i++) {
            var ev = ir.events[musicIds[i]];
            if (!firstMusicEvent
                || ev.tick < firstMusicEvent.tick
                || (ev.tick === firstMusicEvent.tick && ev.measure < firstMusicEvent.measure)) {
                firstMusicEvent = ev;
            }
        }

        if (!firstMusicEvent) return issues;

        // staff-scoped tempo
        var tempoIds = byStaff[canonical.elementKinds.TEMPO_TEXT] || [];
        for (var j = 0; j < tempoIds.length; j++) {
            if (ir.events[tempoIds[j]].tick <= firstMusicEvent.tick) return issues;
        }

        // global scope tempo
        var globalIds = (ir.index.byStaff[-1]) || [];
        for (var g = 0; g < globalIds.length; g++) {
            var gev = ir.events[globalIds[g]];
            if (!Predicates.isTempoMark(gev, ir)) continue;
            if (gev.tick <= firstMusicEvent.tick) return issues;
        }

        issues.push(Issue.createIssue(checker, {
            message: "冒頭にテンポ表記がありません",
            partName: staff.partName,
            staffIdx: 0,
            measure: 1,
            tick: firstMusicEvent.tick
        }));

        return issues;
    }
};
