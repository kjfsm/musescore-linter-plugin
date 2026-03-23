.pragma library

var DYNAMIC_TOKENS = {
    p: true, pp: true, ppp: true, pppp: true,
    f: true, ff: true, fff: true, ffff: true,
    mp: true, mf: true, fp: true, sf: true, sfz: true, sffz: true, rfz: true, fz: true
};

function matchesAny(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
        if (text === patterns[i]) return true;
    }
    return false;
}

function getCanonical(snapshot) {
    if (snapshot && snapshot.registry && snapshot.registry.canonical) {
        return snapshot.registry.canonical;
    }
    return null;
}

function isTextualKind(ev, canonical) {
    if (!canonical) return false;
    return ev.kind === canonical.elementKinds.TEMPO_TEXT
        || ev.kind === canonical.elementKinds.STAFF_TEXT
        || ev.kind === canonical.elementKinds.SYSTEM_TEXT
        || ev.kind === canonical.elementKinds.EXPRESSION
        || ev.kind === canonical.elementKinds.REHEARSAL_MARK
        || ev.kind === canonical.elementKinds.DYNAMIC;
}

function normalizeToken(rawText) {
    return (rawText || "")
        .toLowerCase()
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, "")
        .replace(/\./g, "")
        .trim();
}

function isDynamicLikeText(ev, snapshot) {
    var canonical = getCanonical(snapshot);
    if (canonical && ev.kind === canonical.elementKinds.DYNAMIC) return true;

    var t = (ev.text || "").toLowerCase();
    var raw = (ev.rawText || "").toLowerCase();
    if (t.indexOf("dynamic") === 0 || raw.indexOf("dynamic") === 0) return true;

    var normalized = normalizeToken(raw);
    return !!DYNAMIC_TOKENS[normalized];
}

function isTempoEvent(ev, snapshot) {
    var canonical = getCanonical(snapshot);
    return !!(canonical && ev.kind === canonical.elementKinds.TEMPO_TEXT);
}

function buildPartBuckets(snapshot) {
    var buckets = {};
    var canonical = getCanonical(snapshot);
    if (!canonical) return [];

    for (var s = 0; s < snapshot.staves.length; s++) {
        var staff = snapshot.staves[s];
        var key = staff.partName || ("Staff " + (staff.staffIdx + 1));

        if (!buckets[key]) {
            buckets[key] = {
                partName: key,
                staffIdx: staff.staffIdx,
                events: []
            };
        }

        if (staff.staffIdx < buckets[key].staffIdx) {
            buckets[key].staffIdx = staff.staffIdx;
        }

        for (var e = 0; e < staff.events.length; e++) {
            var ev = staff.events[e];
            if (!isTextualKind(ev, canonical)) continue;
            buckets[key].events.push({
                text: ev.text,
                rawText: ev.rawText,
                tick: ev.tick,
                measure: ev.measure,
                staffIdx: staff.staffIdx
            });
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

        // 同一パート内で重複して収集される同一注記を除外
        // NOTE:
        //   snapshot 側の都合で、同一 tick/text が別 measure として
        //   重複混入するケースを吸収するため、measure をキーに含めない。
        var deduped = [];
        var seen = {};
        for (var i = 0; i < bucket.events.length; i++) {
            var partEv = bucket.events[i];
            var dedupKey = partEv.tick + "|" + partEv.text;
            if (!seen[dedupKey]) {
                deduped.push(partEv);
                seen[dedupKey] = true;
            }
        }

        bucket.events = deduped;
        result.push(bucket);
    }

    result.sort(function(a, b) {
        return a.staffIdx - b.staffIdx;
    });
    return result;
}

function createTextPairChecker(config) {
    // config: {
    //   id:           "pizz-arco",
    //   name:         "Pizz / Arco",
    //   description:  "説明文",
    //   onPatterns:   ["pizz.", "pizz", "pizzicato"],
    //   offPatterns:  ["arco"],
    //   defaultState: "off",
    //   onLabel:      "pizz.",
    //   offLabel:     "arco",
    // }
    return {
        id: config.id,
        name: config.name,
        description: config.description || "",
        level: config.level || "WARN",
        run: function(snapshot) {
            var issues = [];
            var parts = buildPartBuckets(snapshot);

            for (var p = 0; p < parts.length; p++) {
                var part = parts[p];
                var state = config.defaultState;
                var lastSwitchEvent = null;

                for (var e = 0; e < part.events.length; e++) {
                    var ev = part.events[e];
                    if (matchesAny(ev.text, config.onPatterns)) {
                        if (state === "on") {
                            issues.push({
                                ruleId: config.id,
                                severity: "warning",
                                message: part.partName + ": " +
                                    config.onLabel + " が既に指示済みの状態で再度指示されています（" +
                                    ev.measure + "小節目）",
                                staffIdx: part.staffIdx,
                                partName: part.partName,
                                measure: ev.measure,
                                tick: ev.tick
                            });
                        }
                        state = "on";
                        lastSwitchEvent = ev;
                    } else if (matchesAny(ev.text, config.offPatterns)) {
                        if (state === "off") {
                            issues.push({
                                ruleId: config.id,
                                severity: "warning",
                                message: part.partName + ": " +
                                    config.offLabel + " が既に指示済みの状態で再度指示されています（" +
                                    ev.measure + "小節目）",
                                staffIdx: part.staffIdx,
                                partName: part.partName,
                                measure: ev.measure,
                                tick: ev.tick
                            });
                        }
                        state = "off";
                        lastSwitchEvent = ev;
                    }
                }

                // 終端チェック: "on" のまま曲が終了している場合
                if (state === "on" && lastSwitchEvent) {
                    issues.push({
                        ruleId: config.id,
                        severity: "warning",
                        message: part.partName + ": " +
                            config.onLabel + " のまま曲が終了しています（" +
                            config.offLabel + " が必要かもしれません）",
                        staffIdx: part.staffIdx,
                        partName: part.partName,
                        measure: lastSwitchEvent.measure,
                        tick: lastSwitchEvent.tick
                    });
                }
            }
            return issues;
        }
    };
}
