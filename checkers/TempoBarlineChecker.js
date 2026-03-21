.pragma library

var checker = {
    id: "tempo-barline",
    name: "テンポ変更と複縦線",
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

        // 小節線情報を収集: measure番号 -> barlineType
        var barlines = {};
        for (var e2 = 0; e2 < staff.events.length; e2++) {
            var bev = staff.events[e2];
            if (bev.type === "barline") {
                barlines[bev.measure] = bev.barlineType;
            }
        }

        // 各テンポ指示について、前小節に複縦線があるか確認
        // 1小節目のテンポ指示はスキップ（曲頭なので前小節がない）
        for (var t = 0; t < tempoEvents.length; t++) {
            var tm = tempoEvents[t];
            if (tm.measure <= 1) continue;

            var prevMeasure = tm.measure - 1;
            var prevBarline = barlines[prevMeasure];

            // barlineType 2 = double barline (複縦線)
            if (prevBarline !== 2) {
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
