.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = CheckerBase.createTextPairChecker({
    id: "pizz-arco",
    name: "Pizz / Arco",
    onPatterns: ["pizz.", "pizz", "pizzicato"],
    offPatterns: ["arco"],
    defaultState: "off",
    onLabel: "pizz.",
    offLabel: "arco"
});
