.pragma library

function getCanonical(ir) {
    if (ir && ir.registry && ir.registry.canonical) return ir.registry.canonical;
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
    if (canonical && isKind(ev, canonical.elementKinds.DYNAMIC)) return true;
    var subStyle = (ev && ev.subStyle ? String(ev.subStyle) : "").toLowerCase();
    if (subStyle.indexOf("dynamic") !== -1) return true;
    return false;
}

function matchesAny(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
        if (text === patterns[i]) return true;
    }
    return false;
}

function globalEventsByTick(ir) {
    // scope === "global" なイベントの tick → ids
    var out = {};
    var ids = (ir.index && ir.index.byStaff && ir.index.byStaff[-1]) || [];
    for (var i = 0; i < ids.length; i++) {
        var ev = ir.events[ids[i]];
        if (!ev) continue;
        if (out[ev.tick] === undefined) out[ev.tick] = [];
        out[ev.tick].push(ev.id);
    }
    return out;
}

function buildPartBuckets(ir) {
    var buckets = {};
    var canonical = getCanonical(ir);
    if (!canonical) return [];

    var textualKinds = [
        canonical.elementKinds.TEMPO_TEXT,
        canonical.elementKinds.STAFF_TEXT,
        canonical.elementKinds.SYSTEM_TEXT,
        canonical.elementKinds.EXPRESSION,
        canonical.elementKinds.REHEARSAL_MARK,
        canonical.elementKinds.DYNAMIC
    ];

    var metaParts = (ir.meta && ir.meta.parts) ? ir.meta.parts : [];
    for (var s = 0; s < metaParts.length; s++) {
        var staffIdx = metaParts[s].staffIdx;
        var key = metaParts[s].partName || ("Staff " + (staffIdx + 1));
        var byStaff = (ir.index && ir.index.byStaffAndKind && ir.index.byStaffAndKind[staffIdx]) || {};

        if (!buckets[key]) {
            buckets[key] = { partName: key, staffIdx: staffIdx, events: [] };
        } else if (staffIdx < buckets[key].staffIdx) {
            buckets[key].staffIdx = staffIdx;
        }

        for (var k = 0; k < textualKinds.length; k++) {
            var ids = byStaff[textualKinds[k]] || [];
            for (var i = 0; i < ids.length; i++) {
                var ev = ir.events[ids[i]];
                buckets[key].events.push({
                    text: ev.textNorm,
                    rawText: ev.textRaw,
                    tick: ev.tick,
                    measure: ev.measure,
                    staffIdx: ev.staffIdx
                });
            }
        }
    }

    var result = [];
    for (var partName in buckets) {
        if (!buckets.hasOwnProperty(partName)) continue;
        var bucket = buckets[partName];
        bucket.events.sort(function(a, b) {
            if (a.measure !== b.measure) return a.measure - b.measure;
            if (a.tick !== b.tick) return a.tick - b.tick;
            if (a.text !== b.text) return a.text < b.text ? -1 : 1;
            return a.staffIdx - b.staffIdx;
        });
        var deduped = [];
        var seen = {};
        for (var i = 0; i < bucket.events.length; i++) {
            var pev = bucket.events[i];
            var dk = pev.tick + "|" + pev.text;
            if (!seen[dk]) { deduped.push(pev); seen[dk] = true; }
        }
        bucket.events = deduped;
        result.push(bucket);
    }

    result.sort(function(a, b) { return a.staffIdx - b.staffIdx; });
    return result;
}
