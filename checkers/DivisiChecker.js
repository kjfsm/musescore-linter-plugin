.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = CheckerBase.createTextPairChecker({
    id: "div-unis",
    name: "Div. / Unis.",
    onPatterns: ["div.", "div", "divisi"],
    offPatterns: ["unis.", "unis", "unisono"],
    defaultState: "off",
    onLabel: "div.",
    offLabel: "unis."
});
