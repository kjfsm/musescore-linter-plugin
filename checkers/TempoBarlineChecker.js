.pragma library
.import "RulePredicates.js" as RulePredicates

var checker = {
    id: "tempo-barline",
    name: "テンポ変更と複縦線",
    level: "INFO",
    description: "テンポ変更前の小節に複縦線があるかを確認",
    run: function(ir) {
        var issues = [];
        if (!ir.meta || !ir.meta.parts || ir.meta.parts.length === 0) return issues;

        var canonical = RulePredicates.getCanonical(ir);
        if (!canonical) return issues;

        var staff = ir.meta.parts[0];
        var byStaff = ir.index.byStaffAndKind[staff.staffIdx] || {};
        var tempoEvents = [];
        var barlines = {};
        var barlineEvents = [];

        var tempoIds = byStaff[canonical.elementKinds.TEMPO_TEXT] || [];
        for (var t = 0; t < tempoIds.length; t++) {
            tempoEvents.push(ir.events[tempoIds[t]]);
        }

        var barlineIds = byStaff[canonical.elementKinds.BAR_LINE] || [];
        for (var b = 0; b < barlineIds.length; b++) {
            var barEv = ir.events[barlineIds[b]];
            barlines[barEv.measure] = barEv.barlineKind;
            barlineEvents.push(barEv);
        }

        tempoEvents.sort(function(a, b) {
            if (a.tick !== b.tick) return a.tick - b.tick;
            return a.measure - b.measure;
        });

        barlineEvents.sort(function(a, b) {
            if (a.tick !== b.tick) return a.tick - b.tick;
            return a.measure - b.measure;
        });

        var uniqueTempoEvents = [];
        var seenTempoTicks = {};
        for (var t0 = 0; t0 < tempoEvents.length; t0++) {
            var tEv = tempoEvents[t0];
            if (seenTempoTicks[tEv.tick]) continue;
            seenTempoTicks[tEv.tick] = true;
            uniqueTempoEvents.push(tEv);
        }

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

            while (barlineCursor + 1 < barlineEvents.length
                && barlineEvents[barlineCursor + 1].tick < tm.tick) {
                barlineCursor++;
            }
            var prevBarlineByTick = barlineCursor >= 0 ? barlineEvents[barlineCursor] : null;

            var prevMeasure = tm.measure - 1;
            var prevBarline = barlines[prevMeasure];
            var hasDoubleByMeasure = (prevBarline === canonical.barlineKinds.DOUBLE);
            var hasDoubleByTick = (prevBarlineByTick
                && prevBarlineByTick.barlineKind === canonical.barlineKinds.DOUBLE);

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
