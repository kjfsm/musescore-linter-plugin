.pragma library

function cloneEnumMap(E) {
    var out = {};
    if (!E) return out;
    for (var key in E) {
        if (!E.hasOwnProperty(key)) continue;
        out[key] = E[key];
    }
    return out;
}

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

function resolveAnnotationStaffIdx(ann) {
    if (!ann) return -1;
    if (ann.track !== undefined && ann.track !== null && ann.track >= 0) {
        return Math.floor(ann.track / 4);
    }
    if (ann.staffIdx !== undefined && ann.staffIdx !== null && ann.staffIdx >= 0) {
        return ann.staffIdx;
    }
    return -1;
}

// E: QML 側から渡される Element 列挙型
// { CHORD, REST, BAR_LINE, TEMPO_TEXT, STAFF_TEXT, SYSTEM_TEXT, EXPRESSION, REHEARSAL_MARK, DYNAMIC }
function buildSnapshot(score, E) {
    var snapshot = { staves: [], enums: cloneEnumMap(E), unresolvedAnnotations: [] };
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
            var measureEndTick = null;
            if (m.nextMeasure && m.nextMeasure.firstSegment) {
                measureEndTick = m.nextMeasure.firstSegment.tick;
            }
            while (seg) {
                // 現在小節の範囲外に出たら終了
                if (measureEndTick !== null && seg.tick >= measureEndTick) {
                    break;
                }

                // annotations（テキスト系: pizz, arco, con sord. など）
                if (seg.annotations) {
                    for (var a = 0; a < seg.annotations.length; a++) {
                        var ann = seg.annotations[a];
                        var annStaffIdx = resolveAnnotationStaffIdx(ann);
                        // plainText はリッチテキストを除去した値（MuseScore 4）
                        var rawText = (ann.plainText !== undefined && ann.plainText !== null)
                            ? ann.plainText : (ann.text || "");
                        // 万が一 HTML タグが残っている場合に除去
                        var cleanText = rawText.replace(/<[^>]*>/g, "").toLowerCase().trim();
                        if (cleanText.length === 0) continue;

                        var annEvent = {
                            type: "text",
                            text: cleanText,
                            rawText: rawText.replace(/<[^>]*>/g, "").trim(),
                            tick: seg.tick,
                            measure: measureNum,
                            annotationType: (ann.type === E.TEMPO_TEXT) ? "tempo" : "text",
                            elementType: ann.type,
                            subtype: ann.subtype,
                            subStyle: ann.subStyle,
                            tempo: (ann.tempo !== undefined) ? ann.tempo : null
                        };

                        if (annStaffIdx < 0) {
                            // staff が判定不能な注記（例: system text）は未解決注記として保持
                            // staff ループごとに annotations を走査するため、staff 0 のときだけ取り込む
                            if (staffIdx === 0) {
                                annEvent.staffIdx = -1;
                                annEvent.annotationScope = "unresolved";
                                snapshot.unresolvedAnnotations.push(annEvent);
                            }
                            continue;
                        }

                        if (annStaffIdx === staffIdx) {
                            console.log("[ScoreLinter] annotation: staff=" + staffIdx
                                + " m=" + measureNum
                                + " raw='" + ann.text + "'"
                                + " clean='" + cleanText + "'");
                            annEvent.staffIdx = staffIdx;
                            annEvent.annotationScope = "staff";
                            staff.events.push(annEvent);
                        }
                    }
                }

                // 音符・休符（全 voice）
                for (var v0 = 0; v0 < 4; v0++) {
                    var track = staffIdx * 4 + v0;
                    var el = seg.elementAt(track);
                    if (!el) continue;

                    var evType = "other";
                    if (el.type === E.CHORD) evType = "chord";
                    else if (el.type === E.REST) evType = "rest";

                    var ev = {
                        type: evType,
                        tick: seg.tick,
                        measure: measureNum,
                        voice: v0
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
                    if (barEl && barEl.type === E.BAR_LINE) {
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
    console.log("[ScoreLinter] unresolved annotations: " + snapshot.unresolvedAnnotations.length);

    return snapshot;
}
