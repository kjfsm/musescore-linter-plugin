# CLAUDE.md

## プロジェクト概要

MuseScore 4 向けの**楽譜チェック（Lint）プラグイン**。
スコア内のテキスト指示・テンポ・ダイナミクスまわりを走査し、記譜ミスや整合性の崩れを一覧表示する。

---

## 作業ルール

- **思考・回答は日本語**で行うこと
- コミットメッセージ、PR タイトル・本文も**日本語**で書くこと
- 変更の意図が伝わるよう、コミットメッセージには「何を・なぜ変えたか」を簡潔に記載する

---

## ターゲット環境

- **MuseScore 4**（QML プラグイン API）
- MuseScore 3 との後方互換は維持しなくてよい

---

## ファイル構成

```
ScoreLinter.qml              プラグインエントリ。Snapshot / Linter を呼び出し、タブ UI を組み立てる
qml/
  IssuesPanel.qml            問題タブ（バッジフィルタ・検索・パート/ルールフィルタ・空状態）
  SettingsPanel.qml          設定タブ（checker 一覧から自動生成）
  SnapshotPanel.qml          スナップショット（LintIR JSON）表示
  IssueDelegate.qml          問題 1 行の delegate
  SeverityBadge.qml          severity 色・カウントバッジ（トグル可能）
src/
  snapshot.js                スコア走査 → LintIR 生成
  linter.js                  全 checker を実行しソート / ensureDerived
  enumRegistry.js            MuseScore enum を canonical 文字列に正規化
  issue.js                   Issue 型と createIssue / compareIssues
  checkerRegistry.js         register / getAll / getById
  logger.js                  タグ付きロガー
  checkers/
    index.js                 全 checker を Registry に登録（唯一の同期点）
    base/
      predicates.js          共通述語 + buildPartBuckets
      textPairChecker.js     on/off ペア型 checker のファクトリ
    pizzArcoChecker.js       on/off ペア型
    sordinoChecker.js
    soloTuttiChecker.js
    divisiChecker.js
    restAnnotationChecker.js 独立チェック
    tempoBarlineChecker.js
    openingTempoChecker.js
    firstNoteDynamicsChecker.js
test/
  runner.js                  Node.js 用テストランナー（npm test で実行）
  loader.js                  .pragma library / .import を剥がして vm で評価
  irBuilder.js               テスト用の簡易 LintIR ビルダ
```

---

## チェックルールの方針

### 追加・実装してよいルール

以下の条件を**すべて満たす**ものを対象とする。

1. **機械的に判定できる** ― スコアのデータを見るだけで「明らかにミス」と断言できる
2. **MuseScore 4 の入力操作では起きにくい** ― ソフトウェアが防いでくれるミスは対象外
   - 例: 1 小節の拍数オーバー、楽器音域外の音高 → **対象外**
3. **弦楽五重奏（Vn1・Vn2・Va・Vc・Cb）で実際に起きやすい**ものを優先する
   - コピペ後の pizz./arco 消し忘れ、div. 忘れ、senza sord. 忘れ、など

### 連桁（Beam）関連

**このプラグインでは対応しない。** 連桁調整は別プラグインで扱う。

---

## 新しい checker を追加する手順

1. `src/checkers/xxxChecker.js` を作成し `var checker = { ... }` を定義
   - 必須プロパティ: `id, name, description, category, severity, defaultEnabled, run(ir)`
   - Issue は `src/issue.js` の `createIssue(checker, fields)` 経由で生成
   - on/off ペア型なら `src/checkers/base/textPairChecker.js` の `createTextPairChecker()` を利用
2. `src/checkers/index.js` に `import` と `Registry.register(X.checker)` を 1 行ずつ追加（**唯一の同期点**）
3. `test/runner.js` にテストケースを追加（fixture は `irBuilder.buildIR({...})` で構築）
4. README の「チェック項目」表を更新

**QML（ScoreLinter.qml / qml/）と Settings の永続化キーは一切触る必要はない。**
設定 UI は `Linter.getCheckerList()` の結果から自動生成され、ON/OFF は `rulesJson` (JSON 文字列) として保存される。

---

## Checker 契約

```js
{
  id: string,                              // 必須: kebab-case、Registry キー
  name: string,                            // 必須: UI 表示名
  description: string,                     // 必須: 設定タブの説明
  category: "articulation" | "dynamics" | "tempo" | "notation" | ...,  // 必須
  severity: "error" | "warning" | "info",  // 必須: 検出 issue のデフォルト
  defaultEnabled: boolean,                 // 必須
  run: function(ir) -> Issue[]             // 必須
}
```

## Issue 契約

```js
{
  ruleId: string,
  severity: "error" | "warning" | "info",
  category: string,
  message: string,
  partName: string,       // global は ""
  staffIdx: number,       // global は -1
  measure: number,        // 0 = 不定
  tick: number,           // 0 = 不定
  detail: object | null   // 追加情報（前回指示小節など）
}
```

## severity 基準

| レベル | 用途 |
|---|---|
| `error` | 再生・出版に支障が出るレベルの漏れ（冒頭テンポなし、冒頭ダイナミクスなし等） |
| `warning` | on/off の対応漏れ（pizz. のまま終わる等） |
| `info` | あると望ましい記載の漏れ（複縦線等） |

---

## LintIR（概要）

```js
{
  events: [ { id, kind, type, tick, measure, staffIdx, voice, textNorm, textRaw, ... } ],
  index: {
    byTick, byKind, byStaff, byStaffAndKind   // staffIdx === -1 は global scope
  },
  meta: { parts: [{staffIdx, partName}], firstMusicTickByStaff, lastTick },
  registry: { canonical: { elementKinds, barlineKinds } },
  derived: { firstChordByStaff, annotationIdsByTick, globalAnnotationIdsByTick }
}
```

`ir.staves` / `ir.unresolvedAnnotations` は廃止。global scope の注記は `ir.index.byStaff[-1]` で参照する。

---

## パフォーマンスガイド

1. **index を使う**: `ir.index.byKind[K]` / `byStaffAndKind[s][K]` / `byTick[t]` から必要なイベントだけを取り出す。`ir.events` の全件ループは避ける。
2. **derived に乗せる**: 複数 checker が共有する前処理（例: `firstChordByStaff`）は `linter.js` の `ensureDerived` に追加し、`ir.derived.xxx` から参照する。
3. **例外は catch しない**: 各 checker で try/catch を書く必要はない。`linter.runAllCheckers` が全体で catch し、失敗しても他の checker は走る。

---

## テスト

```bash
npm test    # node test/runner.js
```

- `test/irBuilder.js` で最小の LintIR を組み立てる
- `test/loader.js` が `.pragma library` / `.import` を剥がして vm で評価（QML ランタイム不要）
- 新しい checker を追加したら `test/runner.js` にテストケースを追加する

---

## リリースフロー（Changeset）

### 変更内容の記録

機能追加・バグ修正の PR には必ず changeset ファイルを含める。

```bash
npm run changeset   # patch / minor / major を選択し、変更内容を記述
```

生成された `.changeset/*.md` をコミットして PR に含める。

### バージョン種別の目安

| 種別 | 用途 |
|---|---|
| `patch` | バグ修正・ドキュメント更新・内部リファクタリング |
| `minor` | 新しい checker の追加・機能追加 |
| `major` | 破壊的変更（LintIR スキーマ変更など） |

### 自動リリースの流れ

1. changeset 入り PR を main にマージ
2. GitHub Actions が **「バージョンアップ」PR** を自動作成（`package.json` バージョン bump + `CHANGELOG.md` 更新）
3. 「バージョンアップ」PR をマージ → GitHub Release（zip 添付）が自動作成される

### ファイル構成（追加分）

```
.changeset/
  config.json        Changeset 設定（baseBranch: main）
  *.md               変更内容の記録ファイル（自動生成）
scripts/
  release.js         GitHub Release 作成スクリプト（changesets/action から呼ばれる）
.github/workflows/
  ci.yml             push / PR で npm test を実行
  release.yml        main push 時にリリースフローを実行
```
