.pragma library

function isType(ev, snapshot, enumName) {
    var enums = snapshot && snapshot.enums ? snapshot.enums : null;
    if (!enums) return false;
    if (enums[enumName] === undefined || enums[enumName] === null) return false;
    return ev.elementType === enums[enumName];
}

function normalizeToken(rawText) {
    return (rawText || "")
        .toLowerCase()
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, "")
        .replace(/\./g, "")
        .trim();
}

function isDisallowedOnRest(ev, snapshot) {
    var raw = (ev.rawText || ev.text || "").toLowerCase();
    var normalized = normalizeToken(raw);

    // 明示的ダイナミクス記号
    if (isType(ev, snapshot, "DYNAMIC")) return true;

    var dynamicTokens = {
        p: true, pp: true, ppp: true, pppp: true,
        f: true, ff: true, fff: true, ffff: true,
        mp: true, mf: true, fp: true, sf: true, sfz: true, sffz: true, rfz: true, fz: true
    };
    if (dynamicTokens[normalized]) return true;

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
    if (isType(ev, snapshot, "STAFF_TEXT")) return true;
    if (isType(ev, snapshot, "SYSTEM_TEXT")) return true;
    if (isType(ev, snapshot, "EXPRESSION")) return true;
    if (isType(ev, snapshot, "REHEARSAL_MARK")) return true;
    if (isType(ev, snapshot, "DYNAMIC")) return true;

    var hasEnum = snapshot && snapshot.enums
        && (snapshot.enums.STAFF_TEXT !== undefined || snapshot.enums.SYSTEM_TEXT !== undefined);
    if (!hasEnum) return ev.type === "text";
    return false;
}

var checker = {
    id: "rest-annotation",
    name: "休符アノテーション",
    level: "ERROR",
    description: "休符位置の注記を確認（強弱記号・pizz・arco などは不受理、その他テキストは受理）",
    run: function(snapshot) {
        var issues = [];
        for (var s = 0; s < snapshot.staves.length; s++) {
            var staff = snapshot.staves[s];

            var restTicks = {};
            for (var e = 0; e < staff.events.length; e++) {
                if (staff.events[e].type === "rest") {
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
