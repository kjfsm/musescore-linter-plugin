.pragma library
.import "enumRegistry.js" as EnumRegistry

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

function processAnnotations(seg, staffIdx, measureNum, registry, staff, snapshot) {
    if (!seg.annotations) return;
    for (var a = 0; a < seg.annotations.length; a++) {
        var ann = seg.annotations[a];
        var annStaffIdx = resolveAnnotationStaffIdx(ann);
        var rawText = (ann.plainText !== undefined && ann.plainText !== null)
            ? ann.plainText : (ann.text || "");
        var cleanText = rawText.replace(/<[^>]*>/g, "").toLowerCase().trim();
        if (cleanText.length === 0) continue;

        var annKind = registry.resolveElementKind(ann.type);
        var annEvent = {
            type: "text",
            kind: annKind,
            text: cleanText,
            rawText: rawText.replace(/<[^>]*>/g, "").trim(),
            tick: seg.tick,
            measure: measureNum,
            subtype: ann.subtype,
            subStyle: ann.subStyle,
            tempo: (ann.tempo !== undefined) ? ann.tempo : null
        };

        if (annStaffIdx < 0) {
            // staff が判定不能な注記は staff 0 のときだけ未解決注記として保持
            if (staffIdx === 0) {
                annEvent.staffIdx = -1;
                annEvent.annotationScope = "unresolved";
                snapshot.unresolvedAnnotations.push(annEvent);
            }
            continue;
        }

        if (annStaffIdx === staffIdx) {
            annEvent.staffIdx = staffIdx;
            annEvent.annotationScope = "staff";
            staff.events.push(annEvent);
        }
    }
}

function processNotesAndRests(seg, staffIdx, measureNum, registry, staff) {
    var canonical = registry.canonical;

    for (var voice = 0; voice < 4; voice++) {
        var track = staffIdx * 4 + voice;
        var el = seg.elementAt(track);
        if (!el) continue;

        var kind = registry.resolveElementKind(el.type);
        var evType = "other";
        if (kind === canonical.elementKinds.CHORD) evType = "chord";
        else if (kind === canonical.elementKinds.REST) evType = "rest";

        var ev = {
            type: evType,
            kind: kind,
            tick: seg.tick,
            measure: measureNum,
            voice: voice
        };

        if (el.duration) {
            ev.duration = {
                numerator: el.duration.numerator,
                denominator: el.duration.denominator
            };
        }

        staff.events.push(ev);
    }
}

function processBarlines(seg, staffIdx, measureNum, registry, staff) {
    var canonical = registry.canonical;

    for (var voice = 0; voice < 4; voice++) {
        var barEl = seg.elementAt(staffIdx * 4 + voice);
        if (barEl && registry.resolveElementKind(barEl.type) === canonical.elementKinds.BAR_LINE) {
            staff.events.push({
                type: "barline",
                kind: canonical.elementKinds.BAR_LINE,
                barlineType: barEl.barLineType,
                barlineKind: registry.resolveBarlineKind(barEl.barLineType),
                tick: seg.tick,
                measure: measureNum
            });
            break;
        }
    }
}

// E: QML 側から渡される Element/BarLineType 列挙型
function buildSnapshot(score, E) {
    var registry = EnumRegistry.buildEnumRegistry(E);
    var snapshot = { staves: [], registry: { canonical: registry.canonical }, unresolvedAnnotations: [] };
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
                if (measureEndTick !== null && seg.tick >= measureEndTick) break;
                processAnnotations(seg, staffIdx, measureNum, registry, staff, snapshot);
                processNotesAndRests(seg, staffIdx, measureNum, registry, staff);
                processBarlines(seg, staffIdx, measureNum, registry, staff);
                seg = seg.next;
            }
            measureNum++;
            m = m.nextMeasure;
        }

        snapshot.staves.push(staff);
    }

    console.log("[ScoreLinter] snapshot: " + snapshot.staves.length + " staves");
    return snapshot;
}
