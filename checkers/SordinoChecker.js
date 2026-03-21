.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = CheckerBase.createTextPairChecker({
    id: "sordino",
    name: "Con sord. / Senza sord.",
    description: "弱音器の開始(con sord.)→解除(senza sord.)の対応漏れや重複を検知",
    onPatterns: ["con sord.", "con sord", "con sordino"],
    offPatterns: ["senza sord.", "senza sord", "senza sordino"],
    defaultState: "off",
    onLabel: "con sord.",
    offLabel: "senza sord."
});
