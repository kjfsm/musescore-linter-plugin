// テスト用の簡易 LintIR ビルダ。snapshot.js と同じ構造の IR を最小記述から組み立てる。

const CANONICAL = {
    elementKinds: {
        CHORD: "chord", REST: "rest", BAR_LINE: "bar_line",
        TEMPO_TEXT: "tempo_text", STAFF_TEXT: "staff_text",
        SYSTEM_TEXT: "system_text", EXPRESSION: "expression",
        REHEARSAL_MARK: "rehearsal_mark", DYNAMIC: "dynamic",
        UNKNOWN: "unknown"
    },
    barlineKinds: { DOUBLE: "double", OTHER: "other", UNKNOWN: "unknown" }
};

function buildIR(spec) {
    const parts = (spec.parts || []).map((p, i) => ({
        staffIdx: p.staffIdx !== undefined ? p.staffIdx : i,
        partName: p.partName || `Staff ${i + 1}`
    }));

    const ir = {
        events: [],
        index: { byStaff: {}, byTick: {}, byKind: {}, byStaffAndKind: {} },
        meta: {
            parts: parts,
            firstMusicTickByStaff: parts.map(() => null),
            lastTick: 0
        },
        registry: { canonical: CANONICAL },
        derived: null
    };

    for (const e of spec.events || []) {
        const ev = {
            id: ir.events.length,
            tick: e.tick || 0,
            measure: e.measure || 1,
            staffIdx: e.staff !== undefined ? e.staff : (e.staffIdx !== undefined ? e.staffIdx : -1),
            voice: e.voice !== undefined ? e.voice : -1,
            kind: e.kind,
            subtype: e.subtype || null,
            subStyle: e.subStyle || null,
            tempo: e.tempo !== undefined ? e.tempo : null,
            textNorm: e.textNorm || "",
            textRaw: e.textRaw || "",
            scope: e.scope || (e.staff !== undefined && e.staff >= 0 ? "staff" : (e.staffIdx >= 0 ? "staff" : "global")),
            type: e.type || typeFromKind(e.kind)
        };
        if (e.barlineKind !== undefined) ev.barlineKind = e.barlineKind;
        if (e.duration !== undefined) ev.duration = e.duration;
        ir.events.push(ev);

        push(ir.index.byTick, ev.tick, ev.id);
        push(ir.index.byKind, ev.kind, ev.id);
        push(ir.index.byStaff, ev.staffIdx, ev.id);
        if (!ir.index.byStaffAndKind[ev.staffIdx]) ir.index.byStaffAndKind[ev.staffIdx] = {};
        push(ir.index.byStaffAndKind[ev.staffIdx], ev.kind, ev.id);

        if (ev.tick > ir.meta.lastTick) ir.meta.lastTick = ev.tick;
        if (ev.staffIdx >= 0 && (ev.kind === CANONICAL.elementKinds.CHORD || ev.kind === CANONICAL.elementKinds.REST)) {
            if (ir.meta.firstMusicTickByStaff[ev.staffIdx] === null) {
                ir.meta.firstMusicTickByStaff[ev.staffIdx] = ev.tick;
            }
        }
    }

    return ir;
}

function push(map, key, id) {
    if (!map[key]) map[key] = [];
    map[key].push(id);
}

function typeFromKind(kind) {
    if (kind === "chord") return "chord";
    if (kind === "rest") return "rest";
    if (kind === "bar_line") return "barline";
    return "text";
}

module.exports = { buildIR, CANONICAL };
