#!/usr/bin/env node
// ScoreLinter のチェッカーを Node.js で回す簡易テストランナー。
// QML ランタイム無しで checker の挙動を検証する。

const path = require("path");
const { load, reset } = require("./loader");
const { buildIR, CANONICAL } = require("./irBuilder");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

let passed = 0;
let failed = 0;
const failures = [];

function loadLinter() {
    reset();
    return load(path.join(SRC, "linter.js"));
}

function test(name, fn) {
    try {
        fn();
        console.log("  ✓ " + name);
        passed++;
    } catch (e) {
        console.log("  ✗ " + name);
        console.log("    " + (e.stack || e.message || e));
        failed++;
        failures.push({ name, error: e });
    }
}

function assertIssueCount(issues, ruleId, expected) {
    const matched = issues.filter(i => i.ruleId === ruleId);
    if (matched.length !== expected) {
        throw new Error(`ruleId="${ruleId}" の issue 件数: 期待=${expected}, 実測=${matched.length}\n` +
            "  実測内容: " + JSON.stringify(matched, null, 2));
    }
    return matched;
}

function assertNoIssue(issues, ruleId) {
    assertIssueCount(issues, ruleId, 0);
}

function run(ir, enabledRules) {
    const Linter = loadLinter();
    return Linter.runAllCheckers(ir, enabledRules || {});
}

// ----- fixtures ----------------------------------------------------
const K = CANONICAL.elementKinds;
const BK = CANONICAL.barlineKinds;

function irWithOpeningTempoAndDynamics(extra) {
    // すべての checker を通すクリーンな最小 IR。checker 単位のテストで流用。
    const events = [
        { kind: K.TEMPO_TEXT, staff: 0, tick: 0, measure: 1, tempo: 2.0, textNorm: "allegro", textRaw: "Allegro" },
        { kind: K.CHORD,   staff: 0, tick: 0, measure: 1 },
        { kind: K.CHORD,   staff: 1, tick: 0, measure: 1 },
        { kind: K.DYNAMIC, staff: 0, tick: 0, measure: 1, textNorm: "f", textRaw: "f" },
        { kind: K.DYNAMIC, staff: 1, tick: 0, measure: 1, textNorm: "f", textRaw: "f" }
    ];
    return buildIR({
        parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
        events: events.concat(extra || [])
    });
}

// ----- tests -------------------------------------------------------

console.log("\n[clean fixture]");
test("問題なし — 全 checker が 0 件", () => {
    const issues = run(irWithOpeningTempoAndDynamics());
    if (issues.length !== 0) {
        throw new Error(`想定 0 件、実測 ${issues.length} 件: ${JSON.stringify(issues, null, 2)}`);
    }
});

console.log("\n[opening-tempo]");
test("冒頭テンポなし → error 1 件", () => {
    const ir = buildIR({
        parts: [{ partName: "Vn1" }],
        events: [
            { kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
            { kind: K.DYNAMIC, staff: 0, tick: 0, measure: 1, textNorm: "f", textRaw: "f" }
        ]
    });
    const issues = run(ir);
    const matched = assertIssueCount(issues, "opening-tempo", 1);
    if (matched[0].severity !== "error") throw new Error("severity が error でない");
});

test("global scope の tempo があれば pass", () => {
    const ir = buildIR({
        parts: [{ partName: "Vn1" }],
        events: [
            { kind: K.TEMPO_TEXT, staffIdx: -1, scope: "global", tick: 0, measure: 1, tempo: 2.0, textNorm: "allegro", textRaw: "Allegro" },
            { kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
            { kind: K.DYNAMIC, staff: 0, tick: 0, measure: 1, textNorm: "f", textRaw: "f" }
        ]
    });
    const issues = run(ir);
    assertNoIssue(issues, "opening-tempo");
});

console.log("\n[first-note-dynamics]");
test("Vn2 の 1 音目にダイナミクスなし → error 1 件", () => {
    const ir = buildIR({
        parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
        events: [
            { kind: K.TEMPO_TEXT, staff: 0, tick: 0, measure: 1, tempo: 2.0, textNorm: "allegro", textRaw: "Allegro" },
            { kind: K.CHORD,   staff: 0, tick: 0, measure: 1 },
            { kind: K.CHORD,   staff: 1, tick: 0, measure: 1 },
            { kind: K.DYNAMIC, staff: 0, tick: 0, measure: 1, textNorm: "f", textRaw: "f" }
            // Vn2 は dynamic なし
        ]
    });
    const issues = run(ir);
    const matched = assertIssueCount(issues, "first-note-dynamics", 1);
    if (matched[0].partName !== "Vn2") throw new Error("partName が Vn2 でない: " + matched[0].partName);
});

console.log("\n[pizz-arco]");
test("pizz のまま曲が終わる → warning 1 件", () => {
    const ir = irWithOpeningTempoAndDynamics([
        { kind: K.STAFF_TEXT, staff: 0, tick: 480, measure: 1, textNorm: "pizz.", textRaw: "pizz." }
        // arco で解除なし
    ]);
    const issues = run(ir);
    assertIssueCount(issues, "pizz-arco", 1);
});

test("pizz 連続指示 → warning 1 件", () => {
    const ir = irWithOpeningTempoAndDynamics([
        { kind: K.STAFF_TEXT, staff: 0, tick: 480, measure: 1, textNorm: "pizz.", textRaw: "pizz." },
        { kind: K.STAFF_TEXT, staff: 0, tick: 960, measure: 2, textNorm: "pizz.", textRaw: "pizz." },
        { kind: K.STAFF_TEXT, staff: 0, tick: 1440, measure: 3, textNorm: "arco", textRaw: "arco" }
    ]);
    const issues = run(ir);
    const matched = assertIssueCount(issues, "pizz-arco", 1);
    if (matched[0].detail && matched[0].detail.previousMeasure !== 1) {
        throw new Error("前回小節が正しくない: " + JSON.stringify(matched[0].detail));
    }
});

test("pizz → arco ペア対応済み → 0 件", () => {
    const ir = irWithOpeningTempoAndDynamics([
        { kind: K.STAFF_TEXT, staff: 0, tick: 480, measure: 1, textNorm: "pizz.", textRaw: "pizz." },
        { kind: K.STAFF_TEXT, staff: 0, tick: 960, measure: 2, textNorm: "arco", textRaw: "arco" }
    ]);
    assertNoIssue(run(ir), "pizz-arco");
});

console.log("\n[rest-annotation]");
test("休符の位置に強弱記号 → error 1 件", () => {
    const ir = buildIR({
        parts: [{ partName: "Vn1" }],
        events: [
            { kind: K.TEMPO_TEXT, staff: 0, tick: 0, measure: 1, tempo: 2.0, textNorm: "allegro", textRaw: "Allegro" },
            { kind: K.CHORD,   staff: 0, tick: 0, measure: 1 },
            { kind: K.DYNAMIC, staff: 0, tick: 0, measure: 1, textNorm: "f", textRaw: "f" },
            { kind: K.REST,    staff: 0, tick: 480, measure: 1 },
            { kind: K.DYNAMIC, staff: 0, tick: 480, measure: 1, textNorm: "p", textRaw: "p" }
        ]
    });
    assertIssueCount(run(ir), "rest-annotation", 1);
});

console.log("\n[tempo-barline]");
test("テンポ変更前に複縦線なし → info 1 件", () => {
    const ir = buildIR({
        parts: [{ partName: "Vn1" }],
        events: [
            { kind: K.TEMPO_TEXT, staff: 0, tick: 0, measure: 1, tempo: 2.0, textNorm: "allegro", textRaw: "Allegro" },
            { kind: K.CHORD,      staff: 0, tick: 0, measure: 1 },
            { kind: K.DYNAMIC,    staff: 0, tick: 0, measure: 1, textNorm: "f", textRaw: "f" },
            { kind: K.CHORD,      staff: 0, tick: 480, measure: 2 },
            // 小節 2 の末尾に barline なし
            { kind: K.TEMPO_TEXT, staff: 0, tick: 960, measure: 3, tempo: 3.0, textNorm: "presto", textRaw: "Presto" },
            { kind: K.CHORD,      staff: 0, tick: 960, measure: 3 }
        ]
    });
    assertIssueCount(run(ir), "tempo-barline", 1);
});

test("テンポ変更前に複縦線あり → 0 件", () => {
    const ir = buildIR({
        parts: [{ partName: "Vn1" }],
        events: [
            { kind: K.TEMPO_TEXT, staff: 0, tick: 0, measure: 1, tempo: 2.0, textNorm: "allegro", textRaw: "Allegro" },
            { kind: K.CHORD,      staff: 0, tick: 0, measure: 1 },
            { kind: K.DYNAMIC,    staff: 0, tick: 0, measure: 1, textNorm: "f", textRaw: "f" },
            { kind: K.CHORD,      staff: 0, tick: 480, measure: 2 },
            { kind: K.BAR_LINE,   staff: 0, tick: 958, measure: 2, barlineKind: BK.DOUBLE },
            { kind: K.TEMPO_TEXT, staff: 0, tick: 960, measure: 3, tempo: 3.0, textNorm: "presto", textRaw: "Presto" },
            { kind: K.CHORD,      staff: 0, tick: 960, measure: 3 }
        ]
    });
    assertNoIssue(run(ir), "tempo-barline");
});

console.log("\n[disabled rules]");
test("enabledRules で off にした checker は実行されない", () => {
    const ir = buildIR({
        parts: [{ partName: "Vn1" }],
        events: [
            { kind: K.CHORD, staff: 0, tick: 0, measure: 1 }
            // opening-tempo も first-note-dynamics も本来は error
        ]
    });
    const issues = run(ir, { "opening-tempo": false, "first-note-dynamics": false });
    assertNoIssue(issues, "opening-tempo");
    assertNoIssue(issues, "first-note-dynamics");
});

console.log("\n[ソート]");
test("issue は measure → staffIdx → severity → tick 順でソートされる", () => {
    const Linter = loadLinter();
    const mockIssues = [
        { ruleId: "a", severity: "info",    staffIdx: 0, measure: 2, tick: 0 },
        { ruleId: "b", severity: "error",   staffIdx: 1, measure: 1, tick: 500 },
        { ruleId: "c", severity: "warning", staffIdx: 0, measure: 1, tick: 0 },
        { ruleId: "d", severity: "error",   staffIdx: 0, measure: 1, tick: 0 }
    ];
    // issue.js の compareIssues を直接テストするため、reload して呼び出す
    const Issue = require("./loader").load(path.join(SRC, "issue.js"));
    const sorted = mockIssues.slice().sort(Issue.compareIssues);
    const ids = sorted.map(i => i.ruleId).join(",");
    if (ids !== "d,c,b,a") throw new Error("ソート順が想定と違う: " + ids);
});

// ----- 結果 --------------------------------------------------------

console.log("\n────────────────────────");
console.log(`結果: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
