.pragma library
.import "CheckerBase.js" as CheckerBase

function isDisallowedOnRest(ev, snapshot) {
    var raw = (ev.rawText || ev.text || "").toLowerCase();
    var normalized = CheckerBase.normalizeToken(raw);

    // 明示的ダイナミクス記号
    if (CheckerBase.isDynamicLikeText(ev, snapshot)) return true;

    // pizz / arco 系
    var pizzArcoTokens = {
        pizz: true,
        pizzicato: true,
        arco: true
    };
    if (pizzArcoTokens[normalized]) return true;

    // dynamic の内部名フォールバック
    if (raw.indexOf("dynamic") === 0) return true;

    return false;
}

function isAnnotationTarget(ev, snapshot) {
    var canonical = snapshot && snapshot.registry ? snapshot.registry.canonical : null;
    if (!canonical) return false;

    if (ev.kind === canonical.elementKinds.STAFF_TEXT) return true;
    if (ev.kind === canonical.elementKinds.SYSTEM_TEXT) return true;
    if (ev.kind === canonical.elementKinds.EXPRESSION) return true;
    if (ev.kind === canonical.elementKinds.REHEARSAL_MARK) return true;
    if (ev.kind === canonical.elementKinds.DYNAMIC) return true;

    return false;
}

var checker = {
    id: "rest-annotation",
    name: "休符アノテーション",
    level: "ERROR",
    description: "休符位置の注記を確認（強弱記号・pizz・arco などは不受理、その他テキストは受理）",
    run: function(snapshot) {
        var issues = [];
        var canonical = snapshot && snapshot.registry ? snapshot.registry.canonical : null;
        if (!canonical) return issues;

        for (var s = 0; s < snapshot.staves.length; s++) {
            var staff = snapshot.staves[s];

            var restTicks = {};
            for (var e = 0; e < staff.events.length; e++) {
                if (staff.events[e].kind === canonical.elementKinds.REST) {
                    restTicks[staff.events[e].tick] = true;
                }
            }

            for (var e2 = 0; e2 < staff.events.length; e2++) {
                var ev = staff.events[e2];
                if (!isAnnotationTarget(ev, snapshot) || !restTicks[ev.tick]) continue;
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
