.pragma library
.import "base/textPairChecker.js" as Base

var checker = Base.createTextPairChecker({
    id: "solo-tutti",
    name: "Solo / Tutti",
    description: "solo/soli と tutti の対応関係を確認し、重複や戻し忘れを検知",
    category: "articulation",
    severity: "warning",
    defaultEnabled: true,
    onPatterns: ["solo", "soli"],
    offPatterns: ["tutti"],
    defaultState: "off",
    onLabel: "solo",
    offLabel: "tutti"
});
