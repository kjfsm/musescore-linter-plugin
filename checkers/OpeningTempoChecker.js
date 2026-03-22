.pragma library

function isTempoEvent(ev, snapshot) {
    var enums = snapshot && snapshot.enums ? snapshot.enums : null;
    if (enums && enums.TEMPO_TEXT !== undefined && enums.TEMPO_TEXT !== null) {
        return ev.elementType === enums.TEMPO_TEXT;
    }
    return ev.type === "text" && ev.annotationType === "tempo";
}

var checker = {
    id: "opening-tempo",
    name: "冒頭テンポ表記",
    level: "ERROR",
    description: "曲頭にテンポ表記があるかを確認（未記載は不受理）",
    run: function(snapshot) {
        var issues = [];
        if (!snapshot.staves || snapshot.staves.length === 0) return issues;

        var staff = snapshot.staves[0];
        var firstMusicTick = null;
        var hasTempoAtOpening = false;

        for (var i = 0; i < staff.events.length; i++) {
            var ev = staff.events[i];
            if (ev.type === "chord" || ev.type === "rest") {
                if (firstMusicTick === null || ev.tick < firstMusicTick) {
                    firstMusicTick = ev.tick;
                }
            }
        }

        if (firstMusicTick === null) return issues;

        for (var j = 0; j < staff.events.length; j++) {
            var tev = staff.events[j];
            if (!isTempoEvent(tev, snapshot)) continue;
            if (tev.tick <= firstMusicTick) {
                hasTempoAtOpening = true;
                break;
            }
        }

        if (!hasTempoAtOpening) {
            issues.push({
                ruleId: "opening-tempo",
                severity: "error",
                message: "冒頭にテンポ表記がありません",
                staffIdx: 0,
                partName: staff.partName,
                measure: 1,
                tick: firstMusicTick
            });
        }

        return issues;
    }
};
