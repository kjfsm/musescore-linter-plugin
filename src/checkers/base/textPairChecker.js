.pragma library
.import "predicates.js" as Predicates
.import "../../issue.js" as Issue

function createTextPairChecker(config) {
    var checker = {
        id: config.id,
        name: config.name,
        description: config.description || "",
        category: config.category || "articulation",
        severity: config.severity || "warning",
        defaultEnabled: config.defaultEnabled !== false,
        run: function(ir) {
            var issues = [];
            var parts = Predicates.buildPartBuckets(ir);

            for (var p = 0; p < parts.length; p++) {
                var part = parts[p];
                var state = config.defaultState;
                var lastSwitchEvent = null;

                for (var e = 0; e < part.events.length; e++) {
                    var ev = part.events[e];
                    if (Predicates.matchesAny(ev.text, config.onPatterns)) {
                        if (state === "on") {
                            issues.push(buildDuplicateIssue(checker, part, ev, config.onLabel, lastSwitchEvent));
                        }
                        state = "on";
                        lastSwitchEvent = ev;
                    } else if (Predicates.matchesAny(ev.text, config.offPatterns)) {
                        if (state === "off") {
                            issues.push(buildDuplicateIssue(checker, part, ev, config.offLabel, lastSwitchEvent));
                        }
                        state = "off";
                        lastSwitchEvent = ev;
                    }
                }

                if (state === "on" && lastSwitchEvent) {
                    issues.push(Issue.createIssue(checker, {
                        message: part.partName + ": " + config.onLabel
                            + " のまま曲が終了しています（" + config.offLabel + " が必要かもしれません）",
                        partName: part.partName,
                        staffIdx: part.staffIdx,
                        measure: lastSwitchEvent.measure,
                        tick: lastSwitchEvent.tick
                    }));
                }
            }
            return issues;
        }
    };
    return checker;
}

function buildDuplicateIssue(checker, part, ev, label, lastSwitchEvent) {
    var previousMeasure = lastSwitchEvent ? lastSwitchEvent.measure : null;
    var suffix = previousMeasure !== null ? "（前回: " + previousMeasure + "小節目）" : "";
    return Issue.createIssue(checker, {
        message: part.partName + ": " + label
            + " が既に指示済みの状態で再度指示されています（" + ev.measure + "小節目）" + suffix,
        partName: part.partName,
        staffIdx: part.staffIdx,
        measure: ev.measure,
        tick: ev.tick,
        detail: { previousMeasure: previousMeasure }
    });
}
