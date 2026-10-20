---
name: musescore-plugin
description: TypeScript で MuseScore 4 プラグインを新規作成・改修するためのガイド。`examples/hello-world` のレイアウトを踏襲した新しいプラグインのスキャフォールディング、QML と TypeScript の橋渡し（esbuild の IIFE + 再エクスポートフッタ）、`@kjfsm/musescore-plugin-sdk-types` の使い方、ビルド・インストール手順を扱う。`MuseScore { }` ブロック、`onRun`、`curScore`、`PluginManifest`、`plugin.qml`、`logic.ts`、`build.ts` といった語が出てきたら起動する。
---

# MuseScore プラグイン作成スキル

このリポジトリ（`@kjfsm/musescore-plugin-sdk`）で TypeScript ベースの MuseScore 4 プラグインを作成・改修するときに参照する。

## 前提となる仕組み

MuseScore 4 のプラグインは `.qml` ファイル（QML + 埋め込み JavaScript）。本 SDK では:

- ロジックは TypeScript で書き、esbuild で **IIFE** にバンドルして `dist/logic.js` に出力する。
- `globalName: "__musescorePlugin"` にエクスポートをまとめたうえで、フッタで各エクスポートをトップレベル変数に再バインドする。これが QML 側の `import "logic.js" as Logic` から `Logic.run` のように見えるための **唯一のブリッジ**。
- `plugin.qml` は手書きで、`MuseScore { ... }` ブロックを宣言する。これが MuseScore に対する真のエントリポイント。
- **ホスト（`MuseScore { }` オブジェクト）を丸ごと渡す。** QML 側で `id: mscore` を付け、`onRun: { Logic.run(mscore) }` のようにホスト自身を渡す。TS 側は helpers の `definePlugin({ run(host) {...} })` で受け、`host.curScore` / `host.Element` / `host.cmd(...)` など API 全体に型付きでアクセスする。ホスト型 `MuseScore` は `qmlpluginapi.h` から自動生成される。
- 型は `@kjfsm/musescore-plugin-sdk-types` から取得する。`Score` などの API 型に加え、ホスト型 `MuseScore`、実行時 enum 型（`RuntimeEnum<Name, Value>` / `ElementEnum` 等）がある。`curScore` / `Qt.quit()` のグローバルも `@kjfsm/musescore-plugin-sdk-types/globals` にあるが、推奨はホスト経由（`host.curScore` / `host.quit()`）。
- **enum は値を持たない型のみ、値は実行時ホストから取る。** `enums.ts` の生成 enum（例: `ElementType`）は値を持たないため、`ElementType.NOTE` のように値として使おうとするとコンパイルエラーになる。`host.Element.NOTE` のように書くと実行中の MuseScore が値を解決するため、バージョン差で enum が並び替わっても壊れない。

## 新しいプラグインを作るときの手順

1. `examples/hello-world/` を `examples/<plugin-name>/` にコピーする（このリポジトリ外で配布パッケージとして作る場合も、レイアウトはそのまま流用する）。
2. `package.json` の `name` を `@kjfsm/musescore-plugin-sdk-<plugin-name>` などに変える。サンプル類は `"private": true` のままでよい。
3. `plugin.qml` の `menuPath`、`title`、`version`、`description`、`pluginType`、`requiresScore` を編集する。
4. `musescore.config.ts` の `PluginManifest` を **`plugin.qml` と一致するように手で同期** する（実行時は QML 側が正となるが、ツーリングが参照するのは TS 側）。
5. `src/logic.ts` にロジックを書く。エントリは `export const run = definePlugin({ run(host) {...} })`（helpers）。`host: MuseScore` 経由で `host.curScore` / `host.Element` などにアクセスする。型は `import type` で取り込む（実行時には型は存在しない）。
6. **QML から呼ぶ全エクスポートを `build.ts` の `exportNames` 配列に追加する**。`definePlugin` を使う場合のエントリ名（例 `run`）も対象。これを忘れると QML 側から関数が見えない。
7. `pnpm install`（必要なら）→ `pnpm --filter <pkg> build`。
8. インストール: `dist/` を `~/Documents/MuseScore4/Plugins/<plugin-name>/` にコピー → MuseScore 4 のプラグインマネージャで有効化。

## 各ファイルのテンプレート

### `plugin.qml`

```qml
import QtQuick 2.15
import MuseScore 3.0

import "logic.js" as Logic

MuseScore {
  id: mscore
  menuPath: "Plugins.<Plugin Name>"
  title: "<Plugin Name>"
  version: "0.1.0"
  description: "<説明>"
  pluginType: "dock"      // "dock" または "dialog"
  requiresScore: false    // 開いている譜面が必要なら true

  onRun: {
    // ホスト（この MuseScore オブジェクト自身）を丸ごと渡す。
    Logic.run(mscore)
  }
}
```

### `musescore.config.ts`

```ts
import type { PluginManifest } from "@kjfsm/musescore-plugin-sdk-types";

const manifest: PluginManifest = {
  menuPath: "Plugins.<Plugin Name>",
  title: "<Plugin Name>",
  version: "0.1.0",
  description: "<説明>",
  pluginType: "dock",
  requiresScore: false,
};

export default manifest;
```

### `src/logic.ts`

```ts
import { definePlugin } from "@kjfsm/musescore-plugin-sdk-helpers";

// QML からは `Logic.run(mscore)` のように MuseScore { } オブジェクト（ホスト）を渡す。
// host 経由で curScore・全 enum・メソッドへ型付きでアクセスできる。
export const run = definePlugin({
  // onVersionMismatch: "throw" にすると型のターゲット版と実行版の不一致で例外を投げる（既定は警告）
  run(host) {
    const score = host.curScore;
    if (!score) {
      console.log("no score is open");
      return;
    }
    // ロジックをここに書く
    console.log(`score has ${score.nstaves} staves`);
    // enum は焼き込まずホストの実行時値で判定する: el.type === host.Element.NOTE
  },
});
```

### `build.ts`

```ts
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "dist");

await mkdir(distDir, { recursive: true });

// QML から呼び出したいエクスポート名をすべて列挙する。
const exportNames = ["run"];

await build({
  entryPoints: [resolve(here, "src/logic.ts")],
  outfile: resolve(distDir, "logic.js"),
  bundle: true,
  format: "iife",
  globalName: "__musescorePlugin",
  target: "es2017",
  platform: "neutral",
  legalComments: "none",
  footer: {
    js: exportNames.map((n) => `var ${n} = __musescorePlugin.${n};`).join("\n"),
  },
});

await copyFile(resolve(here, "plugin.qml"), resolve(distDir, "plugin.qml"));
```

### `package.json`（サンプル/内部用）

```json
{
  "name": "@kjfsm/musescore-plugin-sdk-<plugin-name>",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsx build.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "clean": "rm -rf dist .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@kjfsm/musescore-plugin-sdk-types": "workspace:*",
    "@kjfsm/musescore-plugin-sdk-helpers": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "esbuild": "^0.24.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.0",
    "vitest": "^2.1.6"
  }
}
```

### `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "noEmit": true,
    "lib": ["ES2017"],
    "types": []
  },
  "include": ["src/**/*.ts", "build.ts", "musescore.config.ts"]
}
```

## QML ↔ TypeScript の橋渡しで詰まりやすいところ

- **エクスポートが見えない**: `build.ts` の `exportNames` に追加し忘れていないか確認する。esbuild の IIFE 形式だけではトップレベルにバインドされず、`Logic.fooBar` が `undefined` になる。
- **トップレベル `await` / Node API / DOM API**: 使えない。`platform: "neutral"`、`target: "es2017"` の制約に従う。Promise 自体は使える。
- **`host.curScore` の null チェック**: 何も開いていない状態でメニューから起動されると `null`。常に early return すること（`requiresScore: true` を付けても、防御的に書くのが安全）。
- **ホストを渡し忘れる**: QML の `MuseScore { }` に `id: mscore` を付け、`onRun: { Logic.run(mscore) }` で渡す。`id` を付け忘れるとホスト参照が取れない。
- **enum 値の焼き込み**: `host.Element.NOTE` のように実行時 enum で判定する。生成 enum（`ElementType` 等）は値を持たないため、`ElementType.NOTE` を値として使おうとするとそもそもコンパイルが通らない。
- **`plugin.qml` と `musescore.config.ts` の不一致**: 実行時に効くのは QML 側のみ。`musescore.config.ts` はツーリング用。両者を必ず同期させる。
- **`.qml` のフォーマット**: Biome の対象外（`biome.json` で除外済み）。空白に頼らない。

## 型の探し方

`@kjfsm/musescore-plugin-sdk-types` から MuseScore 4 のプラグイン API 型がそのままインポートできる:

```ts
import type { MuseScore, Score, Cursor, Note } from "@kjfsm/musescore-plugin-sdk-types";
```

実体は `packages/types/src/generated/plugin-api.ts` と `packages/types/src/generated/enums.ts` で、MuseScore 本体の C++ ヘッダから自動生成されている。**手で編集してはいけない**（CI のドリフトチェックで落ちる）。ホスト型 `MuseScore` は `qmlpluginapi.h` から生成され、`curScore`・全 enum・メソッド・`mscoreMajorVersion` 等を含む。

新しい API クラス・enum が必要なときは:

1. `packages/types-generator/config.json` を確認し、対象ヘッダが含まれているか見る。
2. 含まれていなければ `headers` に追加して `pnpm generate:types` を実行。
3. `config.json` と `packages/types/src/generated/` の差分を一緒にコミット。

MuseScore 本体のバージョンを上げるときは `config.json` の `ref`（例: `v4.6.0`）を変えて再生成する。

enum は**値を持たない型のみ**として出力されており（`export const` は無い）、apiv1 の API では実体は数値だが**値はバージョンで並び替わる**ため、生成 enum を値として使うこと自体がコンパイルエラーになる。必ずホストの実行時 enum を使う:

```ts
// ✅ ホストの実行時 enum（値は実行中の MuseScore が解決する）
if (note.type === host.Element.NOTE) { /* ... */ }

// ❌ コンパイルエラー: ElementType は値を持たない型のみ
import { ElementType } from "@kjfsm/musescore-plugin-sdk-types";
if (note.type === ElementType.NOTE) { /* ... */ } // Error: 'ElementType' only refers to a type
```

`host.Element` 等の型は `RuntimeEnum<ElementTypeName, ElementType>`（キーは生成 enum の `<Enum>Name` で型チェック、値はブランド化された `ElementType`）。ブランドが異なる enum 同士の比較（例: `note.type === host.NoteType.NORMAL`）も型エラーになる。要素側に名前がある型は helpers の述語（`isNote` 等、`el.name` 文字列判定）でも区別できる。

## テスト

`vitest` で `src/logic.ts` をテストする。MuseScore のホストはテストでは存在しないので、`MuseScore` 型のモックを作って `run(host)` に渡す（`definePlugin` の返り値はホストを受け取る関数）。バージョン照合が走るので、モックに `mscoreMajorVersion` / `mscoreMinorVersion` / `log` を含めておく。

```ts
import type { MuseScore, Score } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it, vi } from "vitest";
import { run } from "./logic.js";  // ESM では .ts ソースでも .js で import

function mockHost(score: Score | null): MuseScore {
  return {
    curScore: score,
    Element: { NOTE: 28 },
    mscoreMajorVersion: 4,
    mscoreMinorVersion: 7,
    log: () => {},
  } as unknown as MuseScore;
}

describe("plugin", () => {
  it("handles null score", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    run(mockHost(null));
    expect(log).toHaveBeenCalledWith("no score is open");
    log.mockRestore();
  });
});
```

## ビルド & インストール

```sh
# モノレポ内のサンプルをビルド
pnpm --filter @kjfsm/musescore-plugin-sdk-<plugin-name> build

# 出力をプラグインディレクトリへコピー
cp -r examples/<plugin-name>/dist ~/Documents/MuseScore4/Plugins/<plugin-name>

# MuseScore 4 を起動 → 編集 → プラグイン → プラグインマネージャ → 有効化
```

リロード時は MuseScore 4 を再起動するのが確実。

## 規約のまとめ（このリポジトリ固有）

- TypeScript は strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`。配列インデックスアクセスは `T | undefined` を返す。
- ESM のみ（`"type": "module"`、`module: "ESNext"`、`moduleResolution: "Bundler"`）。`.ts` からの相対 import でも拡張子は `.js`。
- Biome（インデント 2 スペース、ダブルクォート、セミコロン、末尾カンマ、行幅 100）。`**/*.qml` と `packages/types/src/generated/**` は対象外。
- Turbo: `build`、`typecheck`、`test` はいずれも `dependsOn: ["^build"]`。`packages/types` を変更すると依存先は事前リビルドされる。
