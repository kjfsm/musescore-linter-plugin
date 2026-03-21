.pragma library

function getPartName(score, staffIdx) {
    if (!score.parts) return "Staff " + (staffIdx + 1);
    var trackOffset = 0;
    for (var i = 0; i < score.parts.length; i++) {
        var part = score.parts[i];
        var staveCount = part.endTrack / 4 - part.startTrack / 4;
        if (staffIdx >= trackOffset && staffIdx < trackOffset + staveCount) {
            var name = part.longName || "";
            return name.length > 0 ? name : "Staff " + (staffIdx + 1);
        }
        trackOffset += staveCount;
    }
    return "Staff " + (staffIdx + 1);
}

function buildSnapshot(score) {
    var snapshot = { staves: [] };
    var numStaves = score.nstaves;

    for (var staffIdx = 0; staffIdx < numStaves; staffIdx++) {
        var staff = {
            staffIdx: staffIdx,
            partName: getPartName(score, staffIdx),
            events: []
        };

        var measureNum = 1;
        var m = score.firstMeasure;
        while (m) {
            var seg = m.firstSegment;
            while (seg) {
                // annotations（テキスト系: pizz, arco, con sord. など）
                if (seg.annotations) {
                    for (var a = 0; a < seg.annotations.length; a++) {
                        var ann = seg.annotations[a];
                        // track から staffIdx を算出（track / 4 の切り捨て）
                        var annStaffIdx = ann.track !== undefined
                            ? Math.floor(ann.track / 4) : ann.staffIdx;
                        // plainText はリッチテキストを除去した値（MuseScore 4）
                        var rawText = (ann.plainText !== undefined && ann.plainText !== null)
                            ? ann.plainText : (ann.text || "");
                        // 万が一 HTML タグが残っている場合に除去
                        var cleanText = rawText.replace(/<[^>]*>/g, "").toLowerCase().trim();
                        if (annStaffIdx === staffIdx && cleanText.length > 0) {
                            var annType = "text";
                            if (ann.type === Element.TEMPO_TEXT) annType = "tempo";
                            console.log("[ScoreLinter] annotation: staff=" + staffIdx
                                + " m=" + measureNum
                                + " raw='" + ann.text + "'"
                                + " clean='" + cleanText + "'");
                            staff.events.push({
                                type: "text",
                                text: cleanText,
                                rawText: rawText.replace(/<[^>]*>/g, "").trim(),
                                tick: seg.tick,
                                measure: measureNum,
                                annotationType: annType
                            });
                        }
                    }
                }

                // 音符・休符（voice 0 のみ）
                var track = staffIdx * 4;
                var el = seg.elementAt(track);
                if (el) {
                    var evType = "other";
                    if (el.type === Element.CHORD) evType = "chord";
                    else if (el.type === Element.REST) evType = "rest";

                    var ev = {
                        type: evType,
                        tick: seg.tick,
                        measure: measureNum
                    };

                    if (el.duration) {
                        ev.duration = {
                            numerator: el.duration.numerator,
                            denominator: el.duration.denominator
                        };
                    }

                    staff.events.push(ev);
                }

                // 小節線（barline）の取得
                for (var v = 0; v < 4; v++) {
                    var barEl = seg.elementAt(staffIdx * 4 + v);
                    if (barEl && barEl.type === Element.BAR_LINE) {
                        staff.events.push({
                            type: "barline",
                            barlineType: barEl.barLineType,
                            tick: seg.tick,
                            measure: measureNum
                        });
                        break;
                    }
                }

                seg = seg.next;
            }
            measureNum++;
            m = m.nextMeasure;
        }

        snapshot.staves.push(staff);
    }

    // デバッグ用サマリー
    console.log("[ScoreLinter] snapshot: " + snapshot.staves.length + " staves");
    for (var si = 0; si < snapshot.staves.length; si++) {
        var st = snapshot.staves[si];
        var textCount = 0;
        for (var ei = 0; ei < st.events.length; ei++) {
            if (st.events[ei].type === "text") textCount++;
        }
        console.log("[ScoreLinter]   staff " + si + " (" + st.partName + "): "
            + st.events.length + " events, " + textCount + " text annotations");
    }

    return snapshot;
}
