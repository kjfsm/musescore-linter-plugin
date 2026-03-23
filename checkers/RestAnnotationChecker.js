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
    run: function(ir) {
        var issues = [];
        var canonical = RulePredicates.getCanonical(ir);
        if (!canonical) return issues;

        var parts = (ir.meta && ir.meta.parts) ? ir.meta.parts : [];
        var annotationKinds = [
            canonical.elementKinds.STAFF_TEXT,
            canonical.elementKinds.SYSTEM_TEXT,
            canonical.elementKinds.EXPRESSION,
            canonical.elementKinds.REHEARSAL_MARK,
            canonical.elementKinds.DYNAMIC
        ];

        for (var s = 0; s < parts.length; s++) {
            var staff = parts[s];
            var byStaff = ir.index.byStaffAndKind[staff.staffIdx] || {};
            var restTicks = {};
            var restIds = byStaff[canonical.elementKinds.REST] || [];
            for (var r = 0; r < restIds.length; r++) {
                var restEv = ir.events[restIds[r]];
                restTicks[restEv.tick] = true;
            }

            for (var k = 0; k < annotationKinds.length; k++) {
                var ids = byStaff[annotationKinds[k]] || [];
                for (var i = 0; i < ids.length; i++) {
                    var ev = ir.events[ids[i]];
                    if (!restTicks[ev.tick]) continue;
                    if (!isDisallowedOnRest(ev, ir)) continue;

                    issues.push({
                        ruleId: "rest-annotation",
                        severity: "error",
                        message: staff.partName + ": 休符に不受理の注記 \"" +
                            ev.textRaw + "\" が付与されています（" +
                            ev.measure + "小節目）",
                        staffIdx: staff.staffIdx,
                        partName: staff.partName,
                        measure: ev.measure,
                        tick: ev.tick
                    });
                }
            }
        }
        return issues;
    }
};
