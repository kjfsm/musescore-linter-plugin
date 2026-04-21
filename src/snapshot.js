.pragma library
.import "enumRegistry.js" as EnumRegistry
.import "logger.js" as Logger

var log = Logger.make("snapshot");

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

function createEmptyIndex() {
    return {
        byStaff: {},
        byTick: {},
        byKind: {},
        byStaffAndKind: {}
    };
}

function pushIndexedId(map, key, eventId) {
    if (map[key] === undefined) map[key] = [];
    map[key].push(eventId);
}

function appendEvent(snapshot, payload) {
    var ev = {
        id: snapshot.events.length,
        tick: (payload.tick !== undefined && payload.tick !== null) ? payload.tick : 0,
        measure: (payload.measure !== undefined && payload.measure !== null) ? payload.measure : 0,
        staffIdx: (payload.staffIdx !== undefined && payload.staffIdx !== null) ? payload.staffIdx : -1,
        voice: (payload.voice !== undefined && payload.voice !== null) ? payload.voice : -1,
        kind: payload.kind,
        subtype: (payload.subtype !== undefined) ? payload.subtype : null,
        subStyle: (payload.subStyle !== undefined) ? payload.subStyle : null,
        tempo: (payload.tempo !== undefined) ? payload.tempo : null,
        textNorm: payload.textNorm || "",
        textRaw: payload.textRaw || "",
        scope: payload.scope || "staff",
        type: payload.type || "other"
    };

    if (payload.barlineType !== undefined) ev.barlineType = payload.barlineType;
    if (payload.barlineKind !== undefined) ev.barlineKind = payload.barlineKind;
    if (payload.duration !== undefined) ev.duration = payload.duration;

    snapshot.events.push(ev);

    pushIndexedId(snapshot.index.byTick, ev.tick, ev.id);
    pushIndexedId(snapshot.index.byKind, ev.kind, ev.id);
    pushIndexedId(snapshot.index.byStaff, ev.staffIdx, ev.id);

    if (snapshot.index.byStaffAndKind[ev.staffIdx] === undefined) {
        snapshot.index.byStaffAndKind[ev.staffIdx] = {};
    }
    pushIndexedId(snapshot.index.byStaffAndKind[ev.staffIdx], ev.kind, ev.id);

    if (ev.tick > snapshot.meta.lastTick) snapshot.meta.lastTick = ev.tick;
    return ev;
}

function normalizeText(rawText) {
    return (rawText || "").replace(/<[^>]*>/g, "").toLowerCase().trim();
}

function processAnnotations(seg, measureNum, registry, snapshot) {
    if (!seg.annotations) return;

    for (var a = 0; a < seg.annotations.length; a++) {
        var ann = seg.annotations[a];
        var annStaffIdx = resolveAnnotationStaffIdx(ann);
        var rawText = (ann.plainText !== undefined && ann.plainText !== null)
            ? ann.plainText : (ann.text || "");
        var cleanText = normalizeText(rawText);
        if (cleanText.length === 0) continue;

        var annKind = registry.resolveElementKind(ann.type);
        appendEvent(snapshot, {
            type: "text",
            kind: annKind,
            tick: seg.tick,
            measure: measureNum,
            staffIdx: annStaffIdx >= 0 ? annStaffIdx : -1,
            voice: -1,
            subtype: ann.subtype,
            subStyle: ann.subStyle,
            tempo: (ann.tempo !== undefined) ? ann.tempo : null,
            textNorm: cleanText,
            textRaw: rawText.replace(/<[^>]*>/g, "").trim(),
            scope: annStaffIdx >= 0 ? "staff" : "global"
        });
    }
}

function processStaffElements(seg, measureNum, staffIdx, registry, snapshot) {
    var canonical = registry.canonical;

    for (var voice = 0; voice < 4; voice++) {
        var track = staffIdx * 4 + voice;
        var el = seg.elementAt(track);
        if (!el) continue;

        var kind = registry.resolveElementKind(el.type);
        if (kind === canonical.elementKinds.CHORD || kind === canonical.elementKinds.REST) {
            var evType = kind === canonical.elementKinds.CHORD ? "chord" : "rest";
            var payload = {
                type: evType,
                kind: kind,
                tick: seg.tick,
                measure: measureNum,
                staffIdx: staffIdx,
                voice: voice,
                scope: "staff"
            };

            if (el.duration) {
                payload.duration = {
                    numerator: el.duration.numerator,
                    denominator: el.duration.denominator
                };
            }

            appendEvent(snapshot, payload);

            if (snapshot.meta.firstMusicTickByStaff[staffIdx] === null) {
                snapshot.meta.firstMusicTickByStaff[staffIdx] = seg.tick;
            }
        }
    }

    for (var v = 0; v < 4; v++) {
        var barEl = seg.elementAt(staffIdx * 4 + v);
        if (barEl && registry.resolveElementKind(barEl.type) === canonical.elementKinds.BAR_LINE) {
            appendEvent(snapshot, {
                type: "barline",
                kind: canonical.elementKinds.BAR_LINE,
                barlineType: barEl.barLineType,
                barlineKind: registry.resolveBarlineKind(barEl.barLineType),
                tick: seg.tick,
                measure: measureNum,
                staffIdx: staffIdx,
                voice: -1,
                scope: "staff"
            });
            break;
        }
    }
}

function buildMetaParts(score, numStaves) {
    var parts = [];
    for (var i = 0; i < numStaves; i++) {
        parts.push({
            staffIdx: i,
            partName: getPartName(score, i)
        });
    }
    return parts;
}

// E: QML 側から渡される Element/BarLineType 列挙型
function buildSnapshot(score, E) {
    var registry = EnumRegistry.buildEnumRegistry(E);
    var numStaves = score.nstaves;

    var snapshot = {
        events: [],
        index: createEmptyIndex(),
        meta: {
            parts: buildMetaParts(score, numStaves),
            firstMusicTickByStaff: [],
            lastTick: 0
        },
        registry: { canonical: registry.canonical },
        derived: null
    };

    for (var s = 0; s < numStaves; s++) {
        snapshot.meta.firstMusicTickByStaff.push(null);
    }

    var measureNum = 1;
    var m = score.firstMeasure;
    while (m) {
        try {
            var seg = m.firstSegment;
            var measureEndTick = null;
            if (m.nextMeasure && m.nextMeasure.firstSegment) {
                measureEndTick = m.nextMeasure.firstSegment.tick;
            }

            while (seg) {
                if (measureEndTick !== null && seg.tick >= measureEndTick) break;

                processAnnotations(seg, measureNum, registry, snapshot);
                for (var staffIdx = 0; staffIdx < numStaves; staffIdx++) {
                    processStaffElements(seg, measureNum, staffIdx, registry, snapshot);
                }
                seg = seg.next;
            }
        } catch (e) {
            log.warn("measure " + measureNum + " の解析中にエラー: " + e);
        }

        measureNum++;
        m = m.nextMeasure;
    }

    log.info("LintIR を生成: events=" + snapshot.events.length
        + ", parts=" + snapshot.meta.parts.length
        + ", lastTick=" + snapshot.meta.lastTick);
    return snapshot;
}
