.pragma library
.import "lexicon.js" as Lexicon

function getCanonical(ir) {
    if (ir && ir.registry && ir.registry.canonical) {
        return ir.registry.canonical;
    }
    return null;
}

function isKind(ev, K) {
    return !!ev && K !== undefined && ev.kind === K;
}

function normalizeToken(rawText) {
    return (rawText || "")
        .toLowerCase()
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, "")
        .replace(/\./g, "")
        .trim();
}

function isTempoMark(ev, ir) {
    var canonical = getCanonical(ir);
    return !!(canonical && isKind(ev, canonical.elementKinds.TEMPO_TEXT));
}

function isDynamicMark(ev, ir) {
    var canonical = getCanonical(ir);

    // 1) kind 優先
    if (canonical && isKind(ev, canonical.elementKinds.DYNAMIC)) return true;

    // 2) subStyle 優先（未解決注記や変換ゆらぎを吸収）
    var subStyle = (ev && ev.subStyle ? String(ev.subStyle) : "").toLowerCase();
    if (subStyle.indexOf("dynamic") !== -1) return true;

    // 3) 最終フォールバック: text/rawText の語彙判定
    var t = (ev && ev.text ? ev.text : "").toLowerCase();
    var raw = (ev && ev.rawText ? ev.rawText : "").toLowerCase();
    if (t.indexOf("dynamic") === 0 || raw.indexOf("dynamic") === 0) return true;

    var normalized = normalizeToken(raw || t);
    return !!Lexicon.DYNAMIC_TOKENS[normalized];
}

function eventsAtTick(ir, tick, staffIdx) {
    var out = [];
    if (!ir || !ir.staves) return out;

    if (staffIdx === undefined || staffIdx === null) {
        for (var s = 0; s < ir.staves.length; s++) {
            var staff = ir.staves[s];
            for (var e = 0; e < staff.events.length; e++) {
                var ev = staff.events[e];
                if (ev.tick === tick) out.push(ev);
            }
        }

        var unresolved = ir.unresolvedAnnotations || [];
        for (var u = 0; u < unresolved.length; u++) {
            if (unresolved[u].tick === tick) out.push(unresolved[u]);
        }
        return out;
    }

    for (var i = 0; i < ir.staves.length; i++) {
        if (ir.staves[i].staffIdx !== staffIdx) continue;
        var staffByIdx = ir.staves[i];
        for (var j = 0; j < staffByIdx.events.length; j++) {
            if (staffByIdx.events[j].tick === tick) out.push(staffByIdx.events[j]);
        }
        break;
    }

    if (staffIdx < 0) {
        var unresolvedOnly = ir.unresolvedAnnotations || [];
        for (var k = 0; k < unresolvedOnly.length; k++) {
            if (unresolvedOnly[k].tick === tick) out.push(unresolvedOnly[k]);
        }
    }

    return out;
}

function firstEvent(ir, predicate, staffIdx) {
    if (!ir || !ir.staves || !predicate) return null;

    var chosen = null;

    function consider(ev) {
        if (!predicate(ev)) return;
        if (!chosen || ev.tick < chosen.tick || (ev.tick === chosen.tick && ev.measure < chosen.measure)) {
            chosen = ev;
        }
    }

    if (staffIdx === undefined || staffIdx === null) {
        for (var s = 0; s < ir.staves.length; s++) {
            var staff = ir.staves[s];
            for (var e = 0; e < staff.events.length; e++) {
                consider(staff.events[e]);
            }
        }
        return chosen;
    }

    for (var i = 0; i < ir.staves.length; i++) {
        if (ir.staves[i].staffIdx !== staffIdx) continue;
        var target = ir.staves[i];
        for (var j = 0; j < target.events.length; j++) {
            consider(target.events[j]);
        }
        break;
    }

    return chosen;
}

function isAnnotationTarget(ev, ir) {
    var canonical = getCanonical(ir);
    if (!canonical) return false;

    return isKind(ev, canonical.elementKinds.STAFF_TEXT)
        || isKind(ev, canonical.elementKinds.SYSTEM_TEXT)
        || isKind(ev, canonical.elementKinds.EXPRESSION)
        || isKind(ev, canonical.elementKinds.REHEARSAL_MARK)
        || isKind(ev, canonical.elementKinds.DYNAMIC);
}

function isTextualKind(ev, canonical) {
    if (!canonical) return false;
    return isKind(ev, canonical.elementKinds.TEMPO_TEXT)
        || isKind(ev, canonical.elementKinds.STAFF_TEXT)
        || isKind(ev, canonical.elementKinds.SYSTEM_TEXT)
        || isKind(ev, canonical.elementKinds.EXPRESSION)
        || isKind(ev, canonical.elementKinds.REHEARSAL_MARK)
        || isKind(ev, canonical.elementKinds.DYNAMIC);
}
