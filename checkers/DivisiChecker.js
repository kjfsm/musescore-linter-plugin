.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = CheckerBase.createTextPairChecker({
    id: "div-unis",
    name: "Div. / Unis.",
    description: "div. と unis. の対応関係を確認し、重複や戻し忘れを検知",
    onPatterns: ["div.", "div", "divisi"],
    offPatterns: ["unis.", "unis", "unisono"],
    defaultState: "off",
    onLabel: "div.",
    offLabel: "unis."
});
