.pragma library
.import "CheckerBase.js" as CheckerBase

var checker = CheckerBase.createTextPairChecker({
    id: "pizz-arco",
    name: "Pizz / Arco",
    description: "ピチカート開始(pizz.)→解除(arco)の順序を確認。連続指示や、pizz.なしのarcoを検知",
    onPatterns: ["pizz.", "pizz", "pizzicato"],
    offPatterns: ["arco"],
    defaultState: "off",
    onLabel: "pizz.",
    offLabel: "arco"
});
