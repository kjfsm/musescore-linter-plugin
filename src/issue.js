.pragma library

var SEVERITY = { ERROR: "error", WARNING: "warning", INFO: "info" };
var SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

function severityRank(sev) {
    return SEVERITY_ORDER[sev] !== undefined ? SEVERITY_ORDER[sev] : 99;
}

function createIssue(checker, fields) {
    var f = fields || {};
    return {
        ruleId: checker.id,
        severity: f.severity || checker.severity || SEVERITY.WARNING,
        category: checker.category || "other",
        message: f.message || "",
        partName: f.partName || "",
        staffIdx: (f.staffIdx !== undefined && f.staffIdx !== null) ? f.staffIdx : -1,
        measure: (f.measure !== undefined && f.measure !== null) ? f.measure : 0,
        tick: (f.tick !== undefined && f.tick !== null) ? f.tick : 0,
        detail: f.detail || null
    };
}

function compareIssues(a, b) {
    if (a.measure !== b.measure) return a.measure - b.measure;
    if (a.staffIdx !== b.staffIdx) return a.staffIdx - b.staffIdx;
    var av = severityRank(a.severity);
    var bv = severityRank(b.severity);
    if (av !== bv) return av - bv;
    return (a.tick || 0) - (b.tick || 0);
}
