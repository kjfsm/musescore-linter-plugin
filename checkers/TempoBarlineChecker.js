.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = {
    id: "tempo-barline",
    name: "テンポ変更と複縦線",
    level: "INFO",
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
            if (CheckerBase.isTempoEvent(ev, snapshot)) {
                tempoEvents.push(ev);
            }
        }

        // 小節線情報を収集
        var barlines = {};
        var barlineEvents = [];
        for (var e2 = 0; e2 < staff.events.length; e2++) {
            var bev = staff.events[e2];
            if (bev.type === "barline") {
                barlines[bev.measure] = bev.barlineKind;
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

        // 同 tick 重複を解消
        var uniqueTempoEvents = [];
        var seenTempoTicks = {};
        for (var t0 = 0; t0 < tempoEvents.length; t0++) {
            var tEv = tempoEvents[t0];
            if (seenTempoTicks[tEv.tick]) continue;
            seenTempoTicks[tEv.tick] = true;
            uniqueTempoEvents.push(tEv);
        }

        // 各テンポ変更について、前小節に複縦線があるか確認
        // 曲頭 tick はスキップ
        var firstTempoTick = uniqueTempoEvents.length > 0 ? uniqueTempoEvents[0].tick : null;
        var prevTempoValue = null;
        var barlineCursor = -1;
        for (var t = 0; t < uniqueTempoEvents.length; t++) {
            var tm = uniqueTempoEvents[t];
            if (tm.tick === firstTempoTick) {
                prevTempoValue = tm.tempo;
                continue;
            }
            if (prevTempoValue !== null && tm.tempo !== null && tm.tempo === prevTempoValue) {
                continue;
            }
            prevTempoValue = tm.tempo;

            // tick 基準で直前の小節線を探索（前進ポインタ）
            while (barlineCursor + 1 < barlineEvents.length
                && barlineEvents[barlineCursor + 1].tick < tm.tick) {
                barlineCursor++;
            }
            var prevBarlineByTick = barlineCursor >= 0 ? barlineEvents[barlineCursor] : null;

            var prevMeasure = tm.measure - 1;
            var prevBarline = barlines[prevMeasure];
            var hasDoubleByMeasure = (prevBarline === "double");
            var hasDoubleByTick = (prevBarlineByTick && prevBarlineByTick.barlineKind === "double");

            if (!hasDoubleByMeasure && !hasDoubleByTick) {
                issues.push({
                    ruleId: "tempo-barline",
                    severity: "info",
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
