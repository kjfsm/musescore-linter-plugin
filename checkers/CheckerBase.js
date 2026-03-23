.pragma library
.import "RulePredicates.js" as RulePredicates

function matchesAny(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
        if (text === patterns[i]) return true;
    }
    return false;
}

function getCanonical(snapshot) {
    return RulePredicates.getCanonical(snapshot);
}

function normalizeToken(rawText) {
    return RulePredicates.normalizeToken(rawText);
}

function isDynamicMark(ev, snapshot) {
    return RulePredicates.isDynamicMark(ev, snapshot);
}

// backward compatibility
function isDynamicLikeText(ev, snapshot) {
    return isDynamicMark(ev, snapshot);
}

function isTempoMark(ev, snapshot) {
    return RulePredicates.isTempoMark(ev, snapshot);
}

// backward compatibility
function isTempoEvent(ev, snapshot) {
    return isTempoMark(ev, snapshot);
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
            if (!RulePredicates.isTextualKind(ev, canonical)) continue;
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
