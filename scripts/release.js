"use strict";

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const version = pkg.version;
const tag = `v${version}`;
const zipName = `musescore-linter-plugin-${version}.zip`;
const zipPath = path.join(ROOT, zipName);

function run(cmd, opts) {
  const result = execSync(cmd, { cwd: ROOT, ...opts });
  return result == null ? "" : result.toString().trim();
}

// 既存リリースの確認（二重作成防止）
try {
  run(`gh release view ${tag}`, { stdio: "pipe" });
  console.log(`リリース ${tag} は既に存在します。スキップします。`);
  process.exit(0);
} catch {
  // まだ存在しない → 続行
}

// ZIP を作成
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log(`ZIP を作成中: ${zipName}`);
run(`zip -r ${zipName} ScoreLinter.qml qml/ src/ README.md`, { stdio: "inherit" });

// CHANGELOG.md から該当バージョンのリリースノートを抽出
let notes = `musescore-linter-plugin ${tag}`;
const changelogPath = path.join(ROOT, "CHANGELOG.md");
if (fs.existsSync(changelogPath)) {
  const changelog = fs.readFileSync(changelogPath, "utf8");
  const match = changelog.match(
    new RegExp(`## ${version.replace(/\./g, "\\.")}[\\s\\S]*?(?=\\n## |$)`)
  );
  if (match) {
    notes = match[0].trim();
  }
}

// GitHub Release を作成
console.log(`GitHub Release を作成中: ${tag}`);
const notesArg = JSON.stringify(notes);
run(`gh release create ${tag} ${zipName} --title "${tag}" --notes ${notesArg}`, {
  stdio: "inherit",
});

console.log(`リリース ${tag} を作成しました。`);
