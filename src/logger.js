.pragma library

var LEVEL = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
var currentLevel = LEVEL.INFO;

function setLevel(level) {
    if (typeof level === "string") {
        var key = level.toUpperCase();
        if (LEVEL[key] !== undefined) currentLevel = LEVEL[key];
        return;
    }
    if (typeof level === "number") currentLevel = level;
}

function make(tag) {
    var prefix = "[ScoreLinter:" + tag + "]";
    return {
        debug: function(msg) {
            if (currentLevel <= LEVEL.DEBUG) console.log(prefix + " " + msg);
        },
        info: function(msg) {
            if (currentLevel <= LEVEL.INFO) console.log(prefix + " " + msg);
        },
        warn: function(msg) {
            if (currentLevel <= LEVEL.WARN) {
                if (typeof console.warn === "function") console.warn(prefix + " " + msg);
                else console.log(prefix + " WARN: " + msg);
            }
        },
        error: function(msg) {
            if (typeof console.error === "function") console.error(prefix + " " + msg);
            else console.log(prefix + " ERROR: " + msg);
        }
    };
}
