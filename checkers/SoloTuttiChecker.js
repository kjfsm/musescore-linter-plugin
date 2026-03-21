.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = CheckerBase.createTextPairChecker({
    id: "solo-tutti",
    name: "Solo / Tutti",
    onPatterns: ["solo", "soli"],
    offPatterns: ["tutti"],
    defaultState: "off",
    onLabel: "solo",
    offLabel: "tutti"
});
