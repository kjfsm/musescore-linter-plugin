.pragma library

function isType(ev, snapshot, enumName) {
    var enums = snapshot && snapshot.enums ? snapshot.enums : null;
    if (!enums) return false;
    if (enums[enumName] === undefined || enums[enumName] === null) return false;
    return ev.elementType === enums[enumName];
}

function isDynamicLikeText(ev, snapshot) {
    if (isType(ev, snapshot, "DYNAMIC")) return true;

    var t = (ev.text || "").toLowerCase();
    var raw = (ev.rawText || "").toLowerCase();
    if (t.indexOf("dynamic") === 0 || raw.indexOf("dynamic") === 0) return true;

    var normalized = raw.replace(/\s+/g, "").replace(/\./g, "");
    var dynamicTokens = {
        p: true, pp: true, ppp: true, pppp: true,
        f: true, ff: true, fff: true, ffff: true,
        mp: true, mf: true, fp: true, sf: true, sfz: true, sffz: true, rfz: true, fz: true
    };
    return !!dynamicTokens[normalized];
}

var checker = {
    id: "first-note-dynamics",
    name: "各パート冒頭ダイナミクス",
    level: "ERROR",
    description: "各パートの1音目にダイナミクスが付いているかを確認（未記載は不受理）",
    run: function(snapshot) {
        var issues = [];
        if (!snapshot.staves) return issues;
        var unresolved = snapshot.unresolvedAnnotations || [];

        for (var s = 0; s < snapshot.staves.length; s++) {
            var staff = snapshot.staves[s];
            var firstChord = null;

            for (var e = 0; e < staff.events.length; e++) {
                var ev = staff.events[e];
                if (ev.type !== "chord") continue;
                if (!firstChord || ev.tick < firstChord.tick) {
                    firstChord = ev;
                }
            }

            if (!firstChord) continue;

            var hasDynamics = false;
            for (var t = 0; t < staff.events.length; t++) {
                var tv = staff.events[t];
                if (tv.tick !== firstChord.tick) continue;
                if (tv.type !== "text") continue;
                if (isDynamicLikeText(tv, snapshot)) {
                    hasDynamics = true;
                    break;
                }
            }

            // 未解決注記（staffIdx: -1）は全体適用として扱う
            if (!hasDynamics) {
                for (var u = 0; u < unresolved.length; u++) {
                    var uev = unresolved[u];
                    if (uev.tick !== firstChord.tick) continue;
                    if (uev.type !== "text") continue;
                    if (isDynamicLikeText(uev, snapshot)) {
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
