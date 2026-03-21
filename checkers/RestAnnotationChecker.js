.pragma library


function isDynamicLikeText(ev) {
    var t = (ev.text || "").toLowerCase();
    var raw = (ev.rawText || "").toLowerCase();

    // MuseScore snapshot ではダイナミクスが dynamic... の内部名で出る場合がある
    if (t.indexOf("dynamic") === 0 || raw.indexOf("dynamic") === 0) return true;

    // プレーンテキストの強弱記号
    var normalized = raw.replace(/\s+/g, "").replace(/\./g, "");
    var dynamicTokens = {
        p: true, pp: true, ppp: true, pppp: true,
        f: true, ff: true, fff: true, ffff: true,
        mp: true, mf: true, fp: true, sf: true, sfz: true, sffz: true, rfz: true, fz: true
    };
    return !!dynamicTokens[normalized];
}

var checker = {
    id: "rest-annotation",
    name: "休符へのアノテーション",
    description: "休符と同位置のテキスト指示を検知（強弱記号は除外）",
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
                if (ev.type === "text" && restTicks[ev.tick] && !isDynamicLikeText(ev)) {
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
