.pragma library
.import "base/predicates.js" as Predicates
.import "../issue.js" as Issue

var checker = {
    id: "rest-annotation",
    name: "休符アノテーション",
    description: "休符位置の注記を確認（強弱記号・pizz・arco などは不受理、その他テキストは受理）",
    category: "notation",
    severity: "error",
    defaultEnabled: true,
    run: function(ir) {
        var issues = [];
        var canonical = Predicates.getCanonical(ir);
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
            var byStaff = (ir.index.byStaffAndKind[staff.staffIdx]) || {};
            var restTicks = {};
            var restIds = byStaff[canonical.elementKinds.REST] || [];
            for (var r = 0; r < restIds.length; r++) {
                restTicks[ir.events[restIds[r]].tick] = true;
            }

            for (var k = 0; k < annotationKinds.length; k++) {
                var ids = byStaff[annotationKinds[k]] || [];
                for (var i = 0; i < ids.length; i++) {
                    var ev = ir.events[ids[i]];
                    if (!restTicks[ev.tick]) continue;
                    if (!Predicates.isDynamicMark(ev, ir)) continue;

                    issues.push(Issue.createIssue(checker, {
                        message: staff.partName + ": 休符に不受理の注記 \"" + ev.textRaw
                            + "\" が付与されています（" + ev.measure + "小節目）",
                        partName: staff.partName,
                        staffIdx: staff.staffIdx,
                        measure: ev.measure,
                        tick: ev.tick
                    }));
                }
            }
        }
        return issues;
    }
};
