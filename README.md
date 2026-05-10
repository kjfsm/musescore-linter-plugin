# musescore-linter-plugin

MuseScore 4 用の **楽譜チェック（Lint）プラグイン**です。
弦楽五重奏（Vn1・Vn2・Va・Vc・Cb）を主眼に、スコア内のテキスト指示・テンポ・ダイナミクスまわりを走査し、記譜ミスや整合性の崩れを一覧表示します。

## インストール方法

### Windows の場合（かんたんインストール）

1. **[最新版の ZIP をダウンロード](https://github.com/kjfsm/musescore-linter-plugin/releases/latest)** します。

2. ダウンロードした ZIP ファイルを右クリックして **「すべて展開」** → 展開先を選んで OK。

3. 展開したフォルダの中にある **`Plugin-installer.bat`** をダブルクリックします。

4. 「以下の場所にプラグインをコピーしますか？」というダイアログが出るので **「はい」** を選択。  
   → プラグインが自動でコピーされます。

5. **MuseScore 4 を起動**し、メニューから **「プラグイン」→「プラグインマネージャー」** を開きます。

6. 一覧の中から **「Score Linter」** にチェックを入れて「OK」。

7. **「プラグイン」→「Score Linter」** でプラグインが起動します。

> **注意：** インストール済みの場合は上書きするか確認ダイアログが出ます。「はい」で最新版に更新できます。

---

### 手動でインストールする場合 / Windows 以外の場合

1. ZIP ファイルを展開して中のファイルをすべて、MuseScore 4 のプラグインフォルダにコピーします。
   - **Windows:** `C:\Users\（ユーザー名）\Documents\MuseScore4\Plugins\musescore-linter-plugin\`
   - **Mac:** `書類/MuseScore4/Plugins/musescore-linter-plugin/`
2. MuseScore 4 を起動し、**「プラグイン」→「プラグインマネージャー」** で **Score Linter** を有効化します。
3. **「プラグイン」→「Score Linter」** で起動します。

---

## チェック項目

| ルール | severity | 目的 |
|---|---|---|
| Pizz / Arco | warning | `pizz.` 開始 → `arco` 解除の対応漏れ・重複 |
| Con sord. / Senza sord. | warning | 弱音器の対応漏れ・重複 |
| Solo / Tutti | warning | `solo`/`soli` → `tutti` の対応漏れ・重複 |
| Div. / Unis. | warning | `div.` → `unis.` の対応漏れ・重複 |
| 休符アノテーション | error | 休符の位置にダイナミクス等が付与されていないか |
| テンポ変更と複縦線 | info | テンポ変更前の小節に複縦線があるか |
| 冒頭テンポ表記 | error | 曲頭にテンポ表記があるか |
| 各パート冒頭ダイナミクス | error | 各パートの 1 音目にダイナミクスがあるか |
| BPM 値なしテンポ | warning | テンポ表記に BPM 値が未設定（再生テンポに反映されない） |
| 重複ダイナミクス | info | 同パートで同じ強弱記号が変化なく連続している箇所 |
| 終止線の確認 | info | 曲末の最終 barline が終止線になっているか |

検出結果は「問題」タブにリスト表示され、クリックで該当 tick へジャンプします（MuseScore 4 の `Cursor.rewindToTick` 対応）。

## UI の機能

- **severity バッジ**（error / warning / info）のクリックで絞り込み
- **検索ボックス**（メッセージ・パート名）で絞り込み
- **パートフィルタ / ルールフィルタ**（ComboBox）
- **「問題をコピー」** でフィルタ後の一覧をクリップボードへ
- **スナップショットタブ** で LintIR（JSON）を確認・コピー（テスト fixture 作成用）

## ファイル構成

```
ScoreLinter.qml              プラグインエントリ（薄い）
qml/
  IssuesPanel.qml            問題タブ（バッジ・検索・フィルタ・空状態）
  SettingsPanel.qml          設定タブ（checker 一覧から自動生成）
  SnapshotPanel.qml          スナップショットタブ
  IssueDelegate.qml          問題 1 行の delegate
  SeverityBadge.qml          severity 色・カウントのバッジ
src/
  snapshot.js                スコアを走査して LintIR を生成
  linter.js                  全 checker を登録順に実行しソート
  enumRegistry.js            MuseScore enum の正規化層
  issue.js                   Issue 型とソートユーティリティ
  checkerRegistry.js         checker の登録・取得
  logger.js                  タグ付きロガー
  checkers/
    index.js                 全 checker を registry に登録（唯一の同期点）
    base/
      predicates.js          共通述語（isDynamicMark 等）と buildPartBuckets
      textPairChecker.js     on/off ペア型 checker のファクトリ
    pizzArcoChecker.js       \
    sordinoChecker.js         > on/off ペア型（4 種）
    soloTuttiChecker.js       >
    divisiChecker.js         /
    restAnnotationChecker.js     独立チェック
    tempoBarlineChecker.js       独立チェック
    openingTempoChecker.js       独立チェック
    firstNoteDynamicsChecker.js  独立チェック
test/
  runner.js                  Node.js 用テストランナー
  loader.js                  .pragma library / .import を剥がしてロード
  irBuilder.js               簡易 LintIR ビルダ
```

## 使い方

インストール後、チェックしたいスコアを開いた状態で **「プラグイン」→「Score Linter」** を起動し、「実行」ボタンを押すとチェックが始まります。

## 設定の永続化

設定は QML `Settings` の単一プロパティ `rulesJson`（JSON 文字列）に保存されます。
これにより新しい checker を追加しても QML を触る必要はありません（後述の追加手順参照）。

## 新しい checker の追加手順

1. `src/checkers/xxxChecker.js` を作成し `var checker = { ... }` を定義
   - 必須プロパティ: `id, name, description, category, severity, defaultEnabled, run(ir)`
   - Issue は `src/issue.js` の `createIssue(checker, fields)` 経由で生成
   - on/off ペア型なら `src/checkers/base/textPairChecker.js` の `createTextPairChecker()` を利用
2. `src/checkers/index.js` に `import` と `Registry.register(X.checker)` を 1 行ずつ追加
3. README のチェック項目表を更新

**QML も `ScoreLinter.qml` も触る必要はありません。**設定 UI は `Linter.getCheckerList()` の結果から自動生成されます。

## テストの実行

```bash
npm test   # node test/runner.js
```

`test/runner.js` は `.pragma library` / `.import` を剥がして vm に読み込み、最小 LintIR で各 checker の挙動を検証します。MuseScore を起動せずに回帰テストが可能です。

## CI / リリースフロー

### CI

push または PR をオープンすると GitHub Actions が自動で `npm test` を実行します。

### リリース手順

本プロジェクトは [Changesets](https://github.com/changesets/changesets) でバージョン管理をしています。

1. **変更内容を記録する**（機能追加・バグ修正の PR に含める）

   ```bash
   npm run changeset
   # patch / minor / major を選択し、変更内容を入力
   # .changeset/*.md が生成されるのでコミットに含める
   ```

2. **main にマージする**
   - GitHub Actions がバージョン変更用の **「バージョンアップ」PR** を自動作成します。

3. **「バージョンアップ」PR をマージする**
   - `package.json` のバージョンが自動で更新され、GitHub Release（zip 添付）が作成されます。

## パフォーマンスガイド

新しい checker を書くときは、`ir.index` を優先的に活用してください。

- `ir.index.byKind[K]` / `ir.index.byStaffAndKind[s][K]` / `ir.index.byTick[t]` で必要なイベントだけを取り出す
- 全 events の線形走査は避ける
- 共有できる前処理（例: 各 staff の firstChord）は `ir.derived` に 1 回だけ計算して再利用する（`linter.js` の `ensureDerived` に追加）

## LintIR の概要

```js
{
  events: [                      // 全イベントの単一配列（source of truth）
    { id, kind, type, tick, measure, staffIdx, voice, textNorm, textRaw, ... }
  ],
  index: {                       // O(1) 検索用
    byTick:         { [tick]:           [eventId] },
    byKind:         { [kind]:           [eventId] },
    byStaff:        { [staffIdx]:       [eventId] },   // staffIdx === -1 は global scope
    byStaffAndKind: { [staffIdx]: { [kind]: [eventId] } }
  },
  meta: {
    parts: [{ staffIdx, partName }],
    firstMusicTickByStaff: [tick|null, ...],
    lastTick: number
  },
  registry: { canonical: { elementKinds, barlineKinds } },
  derived: {                     // 遅延初期化。linter.js が 1 回だけ構築
    firstChordByStaff, annotationIdsByTick, globalAnnotationIdsByTick
  }
}
```

## 設計メモ

- `staves` / `unresolvedAnnotations` は廃止済み。global scope のイベントは `index.byStaff[-1]` で参照する。
- MuseScore API の列挙値は `enumRegistry.js` で canonical な文字列（`"chord"`, `"tempo_text"` など）へ正規化し、checker は文字列比較のみを行う。
- Issue 型は `issue.js` の `createIssue(checker, fields)` で生成し、severity/category は checker のメタデータから自動付与。
- checker 単体で例外が出ても他の checker は実行継続し、`ruleId: "internal"` の issue として UI に表示される。

## 注意点

- 判定は記譜ルールの補助であり、最終判断は編曲・出版方針に合わせて行ってください。
- テキストの表記ゆれ（全角/半角、独自略語など）によっては検出できない場合があります。
