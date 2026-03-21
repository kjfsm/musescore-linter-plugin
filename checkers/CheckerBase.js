.pragma library

function matchesAny(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
        if (text === patterns[i]) return true;
    }
    return false;
}

function createTextPairChecker(config) {
    // config: {
    //   id:           "pizz-arco",
    //   name:         "Pizz / Arco",
    //   onPatterns:   ["pizz.", "pizz", "pizzicato"],
    //   offPatterns:  ["arco"],
    //   defaultState: "off",
    //   onLabel:      "pizz.",
    //   offLabel:     "arco",
    // }
    return {
        id: config.id,
        name: config.name,
        run: function(snapshot) {
            var issues = [];
            for (var s = 0; s < snapshot.staves.length; s++) {
                var staff = snapshot.staves[s];
                var state = config.defaultState;
                var lastSwitchEvent = null;

                for (var e = 0; e < staff.events.length; e++) {
                    var ev = staff.events[e];
                    if (ev.type !== "text") continue;
                    // snapshot.js で既に lowercase/trim 済み
                    if (matchesAny(ev.text, config.onPatterns)) {
                        if (state === "on") {
                            issues.push({
                                ruleId: config.id,
                                severity: "warning",
                                message: staff.partName + ": " +
                                    config.onLabel + " が既に指示済みの状態で再度指示されています（" +
                                    ev.measure + "小節目）",
                                staffIdx: staff.staffIdx,
                                partName: staff.partName,
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
                                message: staff.partName + ": " +
                                    config.offLabel + " が既に指示済みの状態で再度指示されています（" +
                                    ev.measure + "小節目）",
                                staffIdx: staff.staffIdx,
                                partName: staff.partName,
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
                        message: staff.partName + ": " +
                            config.onLabel + " のまま曲が終了しています（" +
                            config.offLabel + " が必要かもしれません）",
                        staffIdx: staff.staffIdx,
                        partName: staff.partName,
                        measure: lastSwitchEvent.measure,
                        tick: lastSwitchEvent.tick
                    });
                }
            }
            return issues;
        }
    };
}
