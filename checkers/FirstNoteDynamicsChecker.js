.pragma library
.import "RulePredicates.js" as RulePredicates

var checker = {
    id: "first-note-dynamics",
    name: "各パート冒頭ダイナミクス",
    level: "ERROR",
    description: "各パートの1音目にダイナミクスが付いているかを確認（未記載は不受理）",
    run: function(ir) {
        var issues = [];
        if (!ir.meta || !ir.meta.parts) return issues;
        var canonical = RulePredicates.getCanonical(ir);
        if (!canonical) return issues;

        for (var s = 0; s < ir.meta.parts.length; s++) {
            var staff = ir.meta.parts[s];
            var firstChord = ir.derived && ir.derived.firstChordByStaff
                ? ir.derived.firstChordByStaff[staff.staffIdx]
                : null;

            if (!firstChord) continue;

            var atFirstTick = [];
            var tickIds = ir.index.byTick[firstChord.tick] || [];
            for (var i = 0; i < tickIds.length; i++) {
                var tickEv = ir.events[tickIds[i]];
                if (tickEv.staffIdx === staff.staffIdx) atFirstTick.push(tickEv);
            }

            var hasDynamics = false;
            for (var t = 0; t < atFirstTick.length; t++) {
                if (RulePredicates.isDynamicMark(atFirstTick[t], ir)) {
                    hasDynamics = true;
                    break;
                }
            }

            if (!hasDynamics) {
                var unresolved = ir.unresolvedAnnotations || [];
                var unresolvedIds = (ir.derived && ir.derived.unresolvedAnnotationIdsByTick)
                    ? (ir.derived.unresolvedAnnotationIdsByTick[firstChord.tick] || [])
                    : [];
                for (var u = 0; u < unresolvedIds.length; u++) {
                    if (RulePredicates.isDynamicMark(unresolved[unresolvedIds[u]], ir)) {
                        hasDynamics = true;
                        break;
                    }
                }
            }

            if (!hasDynamics) {
                issues.push({
                    ruleId: "first-note-dynamics",
                    severity: "error",
                    message: staff.partName + ": 1音目にダイナミクスがありません",
                    staffIdx: staff.staffIdx,
                    partName: staff.partName,
                    measure: firstChord.measure,
                    tick: firstChord.tick
                });
            }
        }

        return issues;
    }
};
