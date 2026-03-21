.pragma library

var checker = {
    id: "rest-annotation",
    name: "休符へのアノテーション",
    run: function(snapshot) {
        var issues = [];
        for (var s = 0; s < snapshot.staves.length; s++) {
            var staff = snapshot.staves[s];

            // tick -> true のマップを作成（休符がある tick）
            var restTicks = {};
            for (var e = 0; e < staff.events.length; e++) {
                if (staff.events[e].type === "rest") {
                    restTicks[staff.events[e].tick] = true;
                }
            }

            // 休符と同じ tick にテキスト指示がある場合に警告
            for (var e2 = 0; e2 < staff.events.length; e2++) {
                var ev = staff.events[e2];
                if (ev.type === "text" && restTicks[ev.tick]) {
                    issues.push({
                        ruleId: "rest-annotation",
                        severity: "warning",
                        message: staff.partName + ": 休符にテキスト指示 \"" +
                            ev.rawText + "\" が付与されています（" +
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
