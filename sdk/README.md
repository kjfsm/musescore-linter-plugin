# musescore-plugin-sdk

MuseScore 4 プラグインを TypeScript で書くための SDK です。

MuseScore のプラグインは `.qml` ファイル（QML + 埋め込み JavaScript）で構成されます。本 SDK は、その JavaScript 部分を TypeScript で記述できるようにし、公式の MuseScore C++ ヘッダから直接生成された型情報を提供します。

## パッケージ一覧

| パッケージ | 役割 | 公開 |
|---|---|---|
| `@kjfsm/musescore-plugin-sdk-types` | MuseScore 4 Plugin API の TypeScript 型定義 | ✅ |
| `@kjfsm/musescore-plugin-sdk-helpers` | Score 走査・選択範囲・ナビゲーションなどのランタイムヘルパ | ✅ |
| `@kjfsm/musescore-plugin-sdk-types-generator` | 内部用：`musescore/MuseScore` の C++ ヘッダから `@kjfsm/musescore-plugin-sdk-types` を再生成 | ❌ |

## 対応 MuseScore バージョン

型パッケージの**メジャーバージョンが MuseScore のマイナーバージョンに対応**します（番号自体に MuseScore 版は埋め込みません）。

| `@kjfsm/musescore-plugin-sdk-types` | MuseScore |
|---|---|
| `1.x` | 4.7 |
| `0.1.x` | 4.6 |

対象の MuseScore に合わせてバージョンを指定してインストールしてください。

```sh
# MuseScore 4.7 向け（最新系列）
pnpm add @kjfsm/musescore-plugin-sdk-types

# MuseScore 4.6 向け
pnpm add "@kjfsm/musescore-plugin-sdk-types@^0.1.0"
```

各リリースが対応する正確な MuseScore コミットは、生成物 `_meta.ts` の `generatedFrom.tag` で確認できます。採番・リリース運用の詳細は `.claude/rules/releasing.md` を参照してください。

## リポジトリ構成

```
packages/
  types/                 # @kjfsm/musescore-plugin-sdk-types — 公開する型定義
  helpers/               # @kjfsm/musescore-plugin-sdk-helpers — 公開するランタイムヘルパ
  types-generator/       # 内部用ジェネレータスクリプト
examples/
  hello-world/           # TS プラグイン + 手書き QML を esbuild でビルド
```

## ワークフロー

インストール:

```sh
pnpm install
```

`packages/types-generator/config.json` で固定された MuseScore のバージョンに基づき、型定義を再生成:

```sh
pnpm generate:types
```

すべてビルド（types パッケージとサンプルプラグイン）:

```sh
pnpm build
```

その他のタスク:

```sh
pnpm test         # 全パッケージで vitest を実行
pnpm typecheck    # 全パッケージで tsc --noEmit を実行
pnpm lint         # biome check
pnpm format       # biome format --write
```

## プラグインの作成

リファレンスとなる構成は `examples/hello-world/` を参照してください。

```
my-plugin/
├── plugin.qml          # 手書き。MuseScore { id: mscore; ... onRun: { Logic.run(mscore) } } を宣言
├── src/logic.ts        # definePlugin({ run(host) {...} }) を export する TypeScript
├── musescore.config.ts # PluginManifest（参考情報。実体は QML が真）
└── build.ts            # esbuild スクリプト：src/logic.ts → dist/logic.js をバンドルし、plugin.qml をコピー
```

QML 側はビルド済みの JS を `import "logic.js" as Logic` で読み込み、`onRun` から `MuseScore { }` オブジェクト自身（ホスト）を `Logic.run(mscore)` で渡します。TS 側は helpers の `definePlugin` で受け、`host.curScore` / `host.Element` / `host.cmd(...)` など API 全体へ型付きでアクセスします。

```ts
// src/logic.ts
import { definePlugin, iterateNotes } from "@kjfsm/musescore-plugin-sdk-helpers";

export const run = definePlugin({
  run(host) {
    const score = host.curScore;
    if (!score) return;
    for (const note of iterateNotes(score)) {
      // enum 値は焼き込まず、実行中の MuseScore が解決した値で判定する
      if (note.type === host.Element.NOTE) console.log("note!");
    }
  },
});
```

ホスト型 `MuseScore`（`curScore`・全 enum・メソッド・`mscoreMajorVersion` 等）は公式ヘッダ `qmlpluginapi.h` から自動生成されます。enum 値をビルド時に焼き込まないため、MuseScore のバージョン差で enum が並び替わっても壊れません。`definePlugin` は起動時に型の生成元バージョンと実行版を照合し、不一致を既定で警告します。

ビルド済みプラグインを MuseScore 4 にインストールする手順:

1. `pnpm --filter ./examples/hello-world build`
2. `examples/hello-world/dist/` を `~/Documents/MuseScore4/Plugins/hello-world/` にコピー
3. MuseScore 4 を起動 → プラグインマネージャ → "Hello World" を有効化
4. プラグインメニュー → Hello World を実行

## CI / リリース設定

### 必要なリポジトリシークレット

| シークレット名 | 用途 | 設定方法 |
|---|---|---|
| `RELEASE_PAT` | リリース用 Personal Access Token | 後述 |
| `NPM_TOKEN` | npm へのパッケージ公開 | npm の Access Tokens ページで `Automation` タイプのトークンを生成し設定する |

### `RELEASE_PAT` が必要な理由

GitHub Actions のデフォルトトークン (`GITHUB_TOKEN`) で作成したコミットや PR は、セキュリティ上の制約により **他のワークフローをトリガーしない** 仕様になっています。

リリースフロー (`release.yml`) では [changesets/action](https://github.com/changesets/action) が "Version Packages" PR を自動作成しますが、この PR 上で `release-dry-run.yml` が走るためには PAT 経由のチェックアウトが必要です。

### `RELEASE_PAT` の設定手順

1. GitHub の **Settings → Developer settings → Personal access tokens → Fine-grained tokens** でトークンを生成する
2. 対象リポジトリを選択し、以下の権限を付与する
   - **Contents**: Read and write
   - **Pull requests**: Read and write
3. 生成したトークンを リポジトリの **Settings → Secrets and variables → Actions** に `RELEASE_PAT` という名前で登録する

---

## MuseScore の新しいリリースに追従する

`packages/types-generator/config.json` を編集し、`ref` を対象タグ（例: `v4.8.0`）に更新したうえで、以下を実行します。

```sh
pnpm generate:types
pnpm typecheck
```

再生成された `packages/types/src/generated/` の差分を、`config.json` の更新と一緒にコミットしてください。

新しい MuseScore の **minor** に上げるときは、型パッケージの **major** を上げる changeset（`pnpm changeset` で `major` を選択）を追加します。採番方針の詳細は `.claude/rules/releasing.md` を参照してください。
