// QML .pragma library モジュールを Node.js でロードするヘルパ。
// 各モジュールは独立した vm context で評価され、.import は事前に alias として注入される。
// 絶対パスをキーにキャッシュするため、同じモジュールは全参照で共有される（Registry の状態を共有するのに必要）。

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const cache = new Map();

function stripDirectives(source) {
    // ".pragma library" を除去
    let out = source.replace(/^\s*\.pragma\s+library\s*$/gm, "");
    // ".import \"...\" as Alias" 行を抽出しつつ除去
    const imports = [];
    out = out.replace(
        /^\s*\.import\s+"([^"]+)"\s+as\s+(\w+)\s*$/gm,
        (_, importPath, alias) => {
            imports.push({ importPath, alias });
            return "";
        }
    );
    return { source: out, imports };
}

function load(absPath) {
    const resolved = path.resolve(absPath);
    if (cache.has(resolved)) return cache.get(resolved);

    const raw = fs.readFileSync(resolved, "utf8");
    const { source, imports } = stripDirectives(raw);

    const context = { console };
    // 先に alias をすべて解決
    for (const imp of imports) {
        const depPath = path.resolve(path.dirname(resolved), imp.importPath);
        context[imp.alias] = load(depPath);
    }

    vm.createContext(context);
    try {
        vm.runInContext(source, context, { filename: resolved });
    } catch (e) {
        throw new Error(`Failed to load ${resolved}: ${e.message}\n${e.stack}`);
    }

    cache.set(resolved, context);
    return context;
}

function reset() {
    cache.clear();
}

module.exports = { load, reset };
