.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = {
    id: "opening-tempo",
    name: "冒頭テンポ表記",
    level: "ERROR",
    description: "曲頭にテンポ表記があるかを確認（未記載は不受理）",
    run: function(snapshot) {
        var issues = [];
        if (!snapshot.staves || snapshot.staves.length === 0) return issues;

        var canonical = snapshot && snapshot.registry ? snapshot.registry.canonical : null;
        if (!canonical) return issues;

        var staff = snapshot.staves[0];
        var unresolved = snapshot.unresolvedAnnotations || [];
        var firstMusicTick = null;
        var hasTempoAtOpening = false;

        for (var i = 0; i < staff.events.length; i++) {
            var ev = staff.events[i];
            if (ev.kind === canonical.elementKinds.CHORD || ev.kind === canonical.elementKinds.REST) {
                if (firstMusicTick === null || ev.tick < firstMusicTick) {
                    firstMusicTick = ev.tick;
                }
            }
        }

        if (firstMusicTick === null) return issues;

        for (var j = 0; j < staff.events.length; j++) {
            var tev = staff.events[j];
            if (!CheckerBase.isTempoEvent(tev, snapshot)) continue;
            if (tev.tick <= firstMusicTick) {
                hasTempoAtOpening = true;
                break;
            }
        }

        // 未解決注記（staffIdx: -1）は全体適用として扱う
        if (!hasTempoAtOpening) {
            for (var u = 0; u < unresolved.length; u++) {
                var uev = unresolved[u];
                if (!CheckerBase.isTempoEvent(uev, snapshot)) continue;
                if (uev.tick <= firstMusicTick) {
                    hasTempoAtOpening = true;
                    break;
                }
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
