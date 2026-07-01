# @musescore-linter/core

## 2.2.1

### Patch Changes

- [`597e37b`](https://github.com/kjfsm/musescore-linter-plugin/commit/597e37b40db40ac0f4f4862226c78d1b29f3721e) Thanks [@kjfsm](https://github.com/kjfsm)! - version up

- Updated dependencies [[`597e37b`](https://github.com/kjfsm/musescore-linter-plugin/commit/597e37b40db40ac0f4f4862226c78d1b29f3721e)]:
  - @musescore-linter/musescore-api@1.0.1

## 2.2.0

### Minor Changes

- [#91](https://github.com/kjfsm/musescore-linter-plugin/pull/91) [`df33366`](https://github.com/kjfsm/musescore-linter-plugin/commit/df33366ec561d2f51a8533e03922b66fcfa585d1) Thanks [@kjfsm](https://github.com/kjfsm)! - `buildSnapshot` の呼び出し契約バグを修正し、SDK の版安全ヘルパを活用するようにした。

  **重大バグ修正（`@musescore-linter/core`）**: `ScoreLinter.qml` が `buildSnapshot(curScore, NoteType, BarLineType)` と
  3 引数フラットで呼んでいたが、実際のシグネチャは `(score, hostEnums)` の 2 引数だった。結果 `hostEnums` に
  `NoteType` オブジェクト自体が渡り、`hostEnums.noteType` / `hostEnums.barLineType` が `undefined` になっていた。
  `isGraceNote(chord, undefined)` が各小節の解析で例外を投げ、`buildSnapshot` 内の per-measure `try/catch` が
  握りつぶすため、**スナップショットが実質空になり全 checker が何も検出しない**状態になっていた
  （`[#90](https://github.com/kjfsm/musescore-linter-plugin/issues/90)` で混入・リリース済み）。QML 側の呼び出しを `buildSnapshot(curScore, { noteType, barLineType }, plugin)`
  に修正。

  **SDK の版安全ヘルパを活用**:

  - `buildSnapshot` に第 3 引数 `host?: MuseScore` を追加。渡すと SDK の `checkHostVersion` で型の生成元
    MuseScore バージョンと実行版を照合し、結果を `ir.meta.hostVersion`（`{ ok, generatedTag, running, message? }`）
    に記録する。不一致時は QML 側が警告 issue として結果リストに出す。
  - `hostEnums`（`NoteType`/`BarLineType`）を SDK の `strictEnum` で包み、実行中の版に存在しないメンバへの
    アクセスを「静かな undefined」ではなく例外にする（Proxy 非対応環境ではフォールバック）。

  **内部重複の解消（`@musescore-linter/checkers`）**: 4 checker に重複していた `measureAtTick` と、6 checker に
  重複していた part 名マップ構築を `packages/checkers/src/base/query.ts` の `measureAtTick` / `buildPartNameMap`
  に一本化。挙動は不変。

### Patch Changes

- [#91](https://github.com/kjfsm/musescore-linter-plugin/pull/91) [`df33366`](https://github.com/kjfsm/musescore-linter-plugin/commit/df33366ec561d2f51a8533e03922b66fcfa585d1) Thanks [@kjfsm](https://github.com/kjfsm)! - SDK の enum が「値を持たない型のみ」になる破壊的変更（`@kjfsm/musescore-plugin-sdk-types@2.0.0` / `@kjfsm/musescore-plugin-sdk-helpers@4.0.0`）に追従。`snapshot.ts` にあったローカル回避実装 `classifyBarlineKindRuntime`（SDK 側の焼き込み比較を避けるための重複実装）を削除し、SDK が実行時 enum 対応に更新された `classifyBarlineKind` を直接呼ぶように変更。挙動・出力は不変。

## 2.1.4

### Patch Changes

- [`729b26f`](https://github.com/kjfsm/musescore-linter-plugin/commit/729b26f719a25cb762b11bd3585111deea2964e8) Thanks [@kjfsm](https://github.com/kjfsm)! - ヘアピンがある区間の重複ダイナミクスを誤検出しないよう修正

## 2.1.3

### Patch Changes

- c69f6a5: 重複ダイナミクスチェッカー: 間にヘアピン（クレッシェンド/デクレッシェンド）がある場合は重複判定しないよう修正

## 2.1.2

### Patch Changes

- [#58](https://github.com/kjfsm/musescore-linter-plugin/pull/58) [`1e9cc57`](https://github.com/kjfsm/musescore-linter-plugin/commit/1e9cc57bdcd871ca8870725f8e406210f9e43e77) Thanks [@kjfsm](https://github.com/kjfsm)! - `@kjfsm/musescore-plugin-sdk-helpers` を v0.1.0 → v1.0.1、`@kjfsm/musescore-plugin-sdk-types` を v0.0.2 → v0.1.0 にアップデート。

  SDK の型安全なヘルパー関数（`isChord`、`isRest`、`isBarLine`、`isTempo` 等）を利用するようリファクタリングし、QML 側から enum マップを渡す必要がなくなった。`buildSnapshot` の引数から `MuseScoreEnums` を削除。

## 2.1.1

### Patch Changes

- [#43](https://github.com/kjfsm/musescore-linter-plugin/pull/43) [`bf66404`](https://github.com/kjfsm/musescore-linter-plugin/commit/bf66404524c97a417d997c969c9a9fb5aa76ba78) Thanks [@kjfsm](https://github.com/kjfsm)! - chore: @kjfsm/musescore-plugin-sdk-helpers をインストール

## 2.1.0

### Minor Changes

- [#27](https://github.com/kjfsm/musescore-linter-plugin/pull/27) [`50ef241`](https://github.com/kjfsm/musescore-linter-plugin/commit/50ef24170bd9abb91b69ca3b60154d7c63f16ee8) Thanks [@kjfsm](https://github.com/kjfsm)! - TypeScript + pnpm monorepo への全面移行

  ## 主な変更点

  - **TypeScript 導入**: ビジネスロジック全体を TypeScript で書き直し、型安全性を確保
  - **pnpm workspaces + Turborepo**: `packages/core`・`packages/checkers` の内部モノレポ構成に移行。Turborepo によるビルド依存順序管理とキャッシュで CI を高速化
  - **esbuild バンドル**: `src/bundle-entry.ts` → `dist/bundle.js` のビルドパイプラインを整備。QML の `.pragma library` 制約に対応した IIFE 形式で出力
  - **Vitest 導入**: カスタム vm ベースのテストランナー（`test/loader.js`）を廃止し、TypeScript ネイティブな Vitest に移行
  - **QML UI 全面刷新**: Material Design インスパイアのレイアウトに刷新。severity バッジトグル、カテゴリ別折りたたみ設定、左ボーダーによる severity 強調など
  - **CI/CD 更新**: GitHub Actions ワークフローを pnpm + Turborepo キャッシュ対応に変更

### Patch Changes

- [#28](https://github.com/kjfsm/musescore-linter-plugin/pull/28) [`43902ef`](https://github.com/kjfsm/musescore-linter-plugin/commit/43902ef2e2d33e22841f4e5ffe538f2d503d136d) Thanks [@kjfsm](https://github.com/kjfsm)! - CI ワークフローをさらに強化

  - `ci.yml`: `typecheck` + `test` の並列ジョブに分割（型エラーの早期フィードバック）、`pnpm audit --audit-level=high` による脆弱性チェック追加（GHAS 不要）、`codecov/codecov-action` によるカバレッジ計測・送信追加
  - `vitest.config.ts`: v8 プロバイダーの coverage 設定を追加（lcov レポート生成）
  - `package.json`: `@vitest/coverage-v8` 追加、`test:coverage` スクリプト追加
  - `.gitignore`: `coverage/` を追加
  - `release.yml`: `id-token: write` 追加、`fetch-depth: 0` 追加、Node.js を 24 に更新
  - `codeql.yml` 新規追加: 毎週月曜に JS/TS セキュリティスキャンを実行（GHAS 有効化後に利用可能）

- [#25](https://github.com/kjfsm/musescore-linter-plugin/pull/25) [`dfb2cec`](https://github.com/kjfsm/musescore-linter-plugin/commit/dfb2cec5646545bbc23422e2dc7cfd470d774b8e) Thanks [@kjfsm](https://github.com/kjfsm)! - README と CLAUDE.md に CI・リリースフローのドキュメントを追加
