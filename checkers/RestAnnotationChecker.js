.pragma library
.import "RulePredicates.js" as RulePredicates
.import "lexicon.js" as Lexicon

function isDisallowedOnRest(ev, snapshot) {
    var raw = (ev.rawText || ev.text || "").toLowerCase();
    var normalized = RulePredicates.normalizeToken(raw);

    if (RulePredicates.isDynamicMark(ev, snapshot)) return true;
    if (Lexicon.REST_DISALLOWED_TEXT_TOKENS[normalized]) return true;

    return raw.indexOf("dynamic") === 0;
}

var checker = {
    id: "rest-annotation",
    name: "休符アノテーション",
    level: "ERROR",
    description: "休符位置の注記を確認（強弱記号・pizz・arco などは不受理、その他テキストは受理）",
    run: function(snapshot) {
        var issues = [];
        var canonical = RulePredicates.getCanonical(snapshot);
        if (!canonical) return issues;

        for (var s = 0; s < snapshot.staves.length; s++) {
            var staff = snapshot.staves[s];

            var restTicks = {};
            for (var e = 0; e < staff.events.length; e++) {
                if (RulePredicates.isKind(staff.events[e], canonical.elementKinds.REST)) {
                    restTicks[staff.events[e].tick] = true;
                }
            }

            for (var e2 = 0; e2 < staff.events.length; e2++) {
                var ev = staff.events[e2];
                if (!RulePredicates.isAnnotationTarget(ev, snapshot) || !restTicks[ev.tick]) continue;
                if (!isDisallowedOnRest(ev, snapshot)) continue;

                issues.push({
                    ruleId: "rest-annotation",
                    severity: "error",
                    message: staff.partName + ": 休符に不受理の注記 \"" +
                        ev.rawText + "\" が付与されています（" +
                        ev.measure + "小節目）",
                    staffIdx: staff.staffIdx,
                    partName: staff.partName,
                    measure: ev.measure,
                    tick: ev.tick
                });
            }
        }
        return issues;
    }
};
