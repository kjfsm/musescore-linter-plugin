.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = CheckerBase.createTextPairChecker({
    id: "solo-tutti",
    name: "Solo / Tutti",
    description: "solo/soli と tutti の対応関係を確認し、重複や戻し忘れを検知",
    onPatterns: ["solo", "soli"],
    offPatterns: ["tutti"],
    defaultState: "off",
    onLabel: "solo",
    offLabel: "tutti"
});
