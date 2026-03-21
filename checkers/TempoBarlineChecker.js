.pragma library

var checker = {
    id: "tempo-barline",
    name: "テンポ変更と複縦線",
    description: "テンポ変更前の小節に複縦線があるかを確認",
    run: function(snapshot) {
        var issues = [];
        if (snapshot.staves.length === 0) return issues;

        // テンポはスコア全体に共通のため staff 0 のみチェック
        var staff = snapshot.staves[0];

        // テンポ指示のある小節を収集
        var tempoEvents = [];
        for (var e = 0; e < staff.events.length; e++) {
            var ev = staff.events[e];
            if (ev.type === "text" && ev.annotationType === "tempo") {
                tempoEvents.push(ev);
            }
        }

        // 小節線情報を収集
        var barlines = {};
        var barlineEvents = [];
        for (var e2 = 0; e2 < staff.events.length; e2++) {
            var bev = staff.events[e2];
            if (bev.type === "barline") {
                barlines[bev.measure] = bev.barlineType;
                barlineEvents.push(bev);
            }
        }

        tempoEvents.sort(function(a, b) {
            if (a.tick !== b.tick) return a.tick - b.tick;
            return a.measure - b.measure;
        });

        barlineEvents.sort(function(a, b) {
            if (a.tick !== b.tick) return a.tick - b.tick;
            return a.measure - b.measure;
        });

        // 各テンポ指示について、前小節に複縦線があるか確認
        // 最初のテンポ指示はスキップ（曲頭想定）
        for (var t = 0; t < tempoEvents.length; t++) {
            var tm = tempoEvents[t];
            if (t === 0) continue;

            // tick 基準で直前の小節線を探索
            var prevBarlineByTick = null;
            for (var b = 0; b < barlineEvents.length; b++) {
                if (barlineEvents[b].tick < tm.tick) {
                    prevBarlineByTick = barlineEvents[b];
                } else {
                    break;
                }
            }

            var prevMeasure = tm.measure - 1;
            var prevBarline = barlines[prevMeasure];
            var hasDoubleByMeasure = (prevBarline === 2);
            var hasDoubleByTick = (prevBarlineByTick && prevBarlineByTick.barlineType === 2);

            // barlineType 2 = double barline (複縦線)
            if (!hasDoubleByMeasure && !hasDoubleByTick) {
                issues.push({
                    ruleId: "tempo-barline",
                    severity: "warning",
                    message: "テンポ変更（" + tm.rawText + "）の前の小節（" +
                        prevMeasure + "小節目）に複縦線がありません",
                    staffIdx: 0,
                    partName: staff.partName,
                    measure: prevMeasure,
                    tick: tm.tick
                });
            }
        }

        return issues;
    }
};
