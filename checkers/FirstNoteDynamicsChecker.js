.pragma library
.import "RulePredicates.js" as RulePredicates

var checker = {
    id: "first-note-dynamics",
    name: "各パート冒頭ダイナミクス",
    level: "ERROR",
    description: "各パートの1音目にダイナミクスが付いているかを確認（未記載は不受理）",
    run: function(snapshot) {
        var issues = [];
        if (!snapshot.staves) return issues;
        var canonical = RulePredicates.getCanonical(snapshot);
        if (!canonical) return issues;

        for (var s = 0; s < snapshot.staves.length; s++) {
            var staff = snapshot.staves[s];

            var firstChord = RulePredicates.firstEvent(snapshot, function(ev) {
                return RulePredicates.isKind(ev, canonical.elementKinds.CHORD);
            }, staff.staffIdx);

            if (!firstChord) continue;

            var atFirstTick = RulePredicates.eventsAtTick(snapshot, firstChord.tick, staff.staffIdx);
            var hasDynamics = false;
            for (var t = 0; t < atFirstTick.length; t++) {
                if (RulePredicates.isDynamicMark(atFirstTick[t], snapshot)) {
                    hasDynamics = true;
                    break;
                }
            }

            if (!hasDynamics) {
                var unresolvedAtTick = RulePredicates.eventsAtTick(snapshot, firstChord.tick, -1);
                for (var u = 0; u < unresolvedAtTick.length; u++) {
                    if (RulePredicates.isDynamicMark(unresolvedAtTick[u], snapshot)) {
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
