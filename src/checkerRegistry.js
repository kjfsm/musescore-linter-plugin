.pragma library

var registered = [];
var byId = {};

function register(checker) {
    if (!checker || !checker.id) return;
    if (byId[checker.id]) return;
    registered.push(checker);
    byId[checker.id] = checker;
}

function getAll() {
    return registered.slice();
}

function getById(id) {
    return byId[id] || null;
}

function reset() {
    registered = [];
    byId = {};
}
