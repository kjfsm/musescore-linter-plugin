.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = {
    id: "first-note-dynamics",
    name: "各パート冒頭ダイナミクス",
    level: "ERROR",
    description: "各パートの1音目にダイナミクスが付いているかを確認（未記載は不受理）",
    run: function(snapshot) {
        var issues = [];
        if (!snapshot.staves) return issues;
        var canonical = snapshot && snapshot.registry ? snapshot.registry.canonical : null;
        if (!canonical) return issues;

        var unresolved = snapshot.unresolvedAnnotations || [];

        for (var s = 0; s < snapshot.staves.length; s++) {
            var staff = snapshot.staves[s];
            var firstChord = null;

            for (var e = 0; e < staff.events.length; e++) {
                var ev = staff.events[e];
                if (ev.kind !== canonical.elementKinds.CHORD) continue;
                if (!firstChord || ev.tick < firstChord.tick) {
                    firstChord = ev;
                }
            }

            if (!firstChord) continue;

            var hasDynamics = false;
            for (var t = 0; t < staff.events.length; t++) {
                var tv = staff.events[t];
                if (tv.tick !== firstChord.tick) continue;
                if (CheckerBase.isDynamicLikeText(tv, snapshot)) {
                    hasDynamics = true;
                    break;
                }
            }

            // 未解決注記（staffIdx: -1）は全体適用として扱う
            if (!hasDynamics) {
                for (var u = 0; u < unresolved.length; u++) {
                    var uev = unresolved[u];
                    if (uev.tick !== firstChord.tick) continue;
                    if (CheckerBase.isDynamicLikeText(uev, snapshot)) {
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
