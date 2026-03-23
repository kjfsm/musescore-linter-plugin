.pragma library
.import "RulePredicates.js" as RulePredicates

var checker = {
    id: "opening-tempo",
    name: "冒頭テンポ表記",
    level: "ERROR",
    description: "曲頭にテンポ表記があるかを確認（未記載は不受理）",
    run: function(snapshot) {
        var issues = [];
        if (!snapshot.staves || snapshot.staves.length === 0) return issues;

        var canonical = RulePredicates.getCanonical(snapshot);
        if (!canonical) return issues;

        var staff = snapshot.staves[0];

        var firstMusicEvent = RulePredicates.firstEvent(snapshot, function(ev) {
            return RulePredicates.isKind(ev, canonical.elementKinds.CHORD)
                || RulePredicates.isKind(ev, canonical.elementKinds.REST);
        }, staff.staffIdx);

        if (!firstMusicEvent) return issues;

        var hasTempoAtOpening = false;

        for (var j = 0; j < staff.events.length; j++) {
            var tev = staff.events[j];
            if (!RulePredicates.isTempoMark(tev, snapshot)) continue;
            if (tev.tick <= firstMusicEvent.tick) {
                hasTempoAtOpening = true;
                break;
            }
        }

        if (!hasTempoAtOpening) {
            var unresolved = snapshot.unresolvedAnnotations || [];
            for (var u = 0; u < unresolved.length; u++) {
                var uev = unresolved[u];
                if (!RulePredicates.isTempoMark(uev, snapshot)) continue;
                if (uev.tick <= firstMusicEvent.tick) {
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
                tick: firstMusicEvent.tick
            });
        }

        return issues;
    }
};
