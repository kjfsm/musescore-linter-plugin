.pragma library
.import "RulePredicates.js" as RulePredicates

var checker = {
    id: "opening-tempo",
    name: "冒頭テンポ表記",
    level: "ERROR",
    description: "曲頭にテンポ表記があるかを確認（未記載は不受理）",
    run: function(ir) {
        var issues = [];
        if (!ir.meta || !ir.meta.parts || ir.meta.parts.length === 0) return issues;

        var canonical = RulePredicates.getCanonical(ir);
        if (!canonical) return issues;
        var staff = ir.meta.parts[0];
        var byStaff = ir.index.byStaffAndKind[staff.staffIdx] || {};

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

        var hasTempoAtOpening = false;

        var tempoIds = byStaff[canonical.elementKinds.TEMPO_TEXT] || [];
        for (var j = 0; j < tempoIds.length; j++) {
            var tev = ir.events[tempoIds[j]];
            if (tev.tick <= firstMusicEvent.tick) {
                hasTempoAtOpening = true;
                break;
            }
        }

        if (!hasTempoAtOpening) {
            var unresolved = ir.unresolvedAnnotations || [];
            for (var u = 0; u < unresolved.length; u++) {
                var uev = unresolved[u];
                if (!RulePredicates.isTempoMark(uev, ir)) continue;
                if (uev.tick <= firstMusicEvent.tick) {
                    hasTempoAtOpening = true;
                    break;
                }
            }
        }

        if (!hasTempoAtOpening) {
            issues.push({
                ruleId: "opening-tempo",
                severity: "error",
                message: "冒頭にテンポ表記がありません",
                staffIdx: 0,
                partName: staff.partName,
                measure: 1,
                tick: firstMusicEvent.tick
            });
        }

        return issues;
    }
};
