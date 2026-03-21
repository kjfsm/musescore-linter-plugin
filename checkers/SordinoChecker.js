.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = CheckerBase.createTextPairChecker({
    id: "sordino",
    name: "Con sord. / Senza sord.",
    onPatterns: ["con sord.", "con sord", "con sordino"],
    offPatterns: ["senza sord.", "senza sord", "senza sordino"],
    defaultState: "off",
    onLabel: "con sord.",
    offLabel: "senza sord."
});
