.pragma library
.import "base/predicates.js" as Predicates
.import "../issue.js" as Issue

var checker = {
    id: "first-note-dynamics",
    name: "各パート冒頭ダイナミクス",
    description: "各パートの1音目にダイナミクスが付いているかを確認（未記載は不受理）",
    category: "dynamics",
    severity: "error",
    defaultEnabled: true,
    run: function(ir) {
        var issues = [];
        if (!ir.meta || !ir.meta.parts) return issues;
        var canonical = Predicates.getCanonical(ir);
        if (!canonical) return issues;

        var firstChordByStaff = (ir.derived && ir.derived.firstChordByStaff) || {};

        for (var s = 0; s < ir.meta.parts.length; s++) {
            var staff = ir.meta.parts[s];
            var firstChord = firstChordByStaff[staff.staffIdx];
            if (!firstChord) continue;

            var hasDynamics = false;

            // staff-scoped events at firstChord.tick
            var tickIds = ir.index.byTick[firstChord.tick] || [];
            for (var i = 0; i < tickIds.length; i++) {
                var tev = ir.events[tickIds[i]];
                if (tev.staffIdx !== staff.staffIdx) continue;
                if (Predicates.isDynamicMark(tev, ir)) { hasDynamics = true; break; }
            }

            // global scope events at firstChord.tick
            if (!hasDynamics) {
                var globalIds = (ir.index.byStaff[-1]) || [];
                for (var g = 0; g < globalIds.length; g++) {
                    var gev = ir.events[globalIds[g]];
                    if (gev.tick !== firstChord.tick) continue;
                    if (Predicates.isDynamicMark(gev, ir)) { hasDynamics = true; break; }
                }
            }

            if (!hasDynamics) {
                issues.push(Issue.createIssue(checker, {
                    message: staff.partName + ": 1音目にダイナミクスがありません",
                    partName: staff.partName,
                    staffIdx: staff.staffIdx,
                    measure: firstChord.measure,
                    tick: firstChord.tick
                }));
            }
        }
        return issues;
    }
};
