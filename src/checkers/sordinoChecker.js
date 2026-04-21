.pragma library
.import "base/textPairChecker.js" as Base

var checker = Base.createTextPairChecker({
    id: "sordino",
    name: "Con sord. / Senza sord.",
    description: "弱音器の開始(con sord.)→解除(senza sord.)の対応漏れや重複を検知",
    category: "articulation",
    severity: "warning",
    defaultEnabled: true,
    onPatterns: ["con sord.", "con sord", "con sordino"],
    offPatterns: ["senza sord.", "senza sord", "senza sordino"],
    defaultState: "off",
    onLabel: "con sord.",
    offLabel: "senza sord."
});
