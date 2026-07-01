# musescore-linter-plugin

MuseScore 4 用の **楽譜チェック（Lint）プラグイン**です。
弦楽五重奏（Vn1・Vn2・Va・Vc・Cb）を主眼に、スコア内のテキスト指示・テンポ・ダイナミクスまわりを走査し、記譜ミスや整合性の崩れを一覧表示します。

## インストール方法

1. **[最新版の ZIP をダウンロード](https://github.com/kjfsm/musescore-linter-plugin/releases/latest/download/musescore-linter-plugin.zip)** し、ZIP を展開します。
   - ZIP URL: `https://github.com/kjfsm/musescore-linter-plugin/releases/latest/download/musescore-linter-plugin.zip`

2. 展開したフォルダの中身を、MuseScore 4 のプラグインフォルダに配置します。
   - **Windows:** `C:\Users\（ユーザー名）\Documents\MuseScore4\Plugins\musescore-linter-plugin\`
   - **Mac:** `書類/MuseScore4/Plugins/musescore-linter-plugin/`

3. MuseScore 4 を起動し、**「プラグイン」→「プラグインマネージャー」** で **Score Linter** を有効化します。

4. **「プラグイン」→「Score Linter」** で起動します。

## アップデート方法

プラグイン画面ヘッダーの **「アップデート確認」** ボタンを押すと、GitHub Releases の最新版と現在のバージョンを比較します。

- 新しいバージョンがある場合はバナーで通知されます。
  - **「ZIP をダウンロード」** … 最新版 ZIP をブラウザでダウンロードします。
  - **「プラグインフォルダを開く」** … 現在のインストール先フォルダを開きます。
- ダウンロードした ZIP を展開し、**開いたフォルダの中身を置き換えてから MuseScore を再起動**してください。

> MuseScore のプラグインは起動時にスクリプトをキャッシュするため、ファイル置き換え後は再起動が必要です（自動でのファイル置き換えは行いません）。ネットワークに接続できない場合は確認できない旨が表示されます。

---

## チェック項目

| ルール | severity | 目的 |
|---|---|---|
| Pizz / Arco | warning | `pizz.` 開始 → `arco` 解除の対応漏れ・重複 |
| Con sord. / Senza sord. | warning | 弱音器の対応漏れ・重複 |
| Solo / Tutti | warning | `solo`/`soli` → `tutti` の対応漏れ・重複 |
| Div. / Unis. | warning | `div.` → `unis.` の対応漏れ・重複 |
| Sul tasto / Ord. | warning | `sul tasto`（駒から離れた奏法）→ `ord.` 復帰の対応漏れ・重複 |
| Sul pont. / Ord. | warning | `sul pont.`（駒寄り奏法）→ `ord.` 復帰の対応漏れ・重複 |
| Con legno / Arco | warning | `con legno`（弓の木部奏法）→ `arco` 復帰の対応漏れ・重複 |
| Mute / Open | warning | 金管の `mute`/`straight mute` 等 → `open` 復帰の対応漏れ・重複 |
| Una corda / Tre corde | warning | ピアノ左ペダル `una corda` → `tre corde` の対応漏れ・重複 |
| Près de la table / Ord. | warning | ハープ `près de la table`（響板寄り奏法）→ `ordinario` 復帰の対応漏れ・重複 |
| 同リズム間のスラー/タイ/アーティキュレーション | info | 同じ小節で同じリズムのパート間でスラー・タイの有無やアーティキュレーションが食い違う |
| 休符アノテーション | error | 休符の位置にダイナミクス等が付与されていないか |
| テンポ変更と複縦線 | info | テンポ変更前の小節に複縦線があるか |
| 冒頭テンポ表記 | error | 曲頭にテンポ表記があるか |
| 各パート冒頭ダイナミクス | error | 各パートの 1 音目にダイナミクスがあるか |
| BPM 値なしテンポ | warning | テンポ表記に BPM 値が未設定（再生テンポに反映されない） |
| テンポ変化の解除漏れ | warning | `rit.`/`accel.` 等が `a tempo`/新テンポで解除されないまま終わる |
| 重複ダイナミクス | info | 同パートで同じ強弱記号が変化なく連続している箇所 |
| 同時ダイナミクスの衝突 | warning | 同じ位置に異なる強弱記号が同時に付いている |
| ヘアピンの到達先ダイナミクス | info | crescendo/diminuendo の終端に到達先のダイナミクスが無い（曲尾のヘアピンは除外） |
| 終止線の確認 | info | 曲末の最終 barline が終止線になっているか |
| コーダ/セーニョ整合性 | error | `D.S.`/`D.C.` と `Segno`/`Coda`/`Fine` の対応（参照先マークの欠落） |
| リハーサルマークの順序 | info | リハーサルマークの順序逆転・重複 |
| リピート小節線の対応 | warning | リピート開始(‖:)に対応する終了(:‖)が無い（終了のみは曲頭反復として許容） |
| 異音程のタイ | warning | 異なる音高をタイで結んでいる（スラーの書き間違いの可能性） |
| 親切臨時記号の提案 | info | 前小節で臨時記号が付いた音が次小節で記号なしで再び現れる箇所に親切記号を提案 |
| 休符上のスパナー端点 | warning | ヘアピン(cresc./dim.)やスラーの端点が休符上にある（同 tick に音符があれば許容） |
| 単一音スラー | info | スラーが単一音（開始 tick == 終了 tick）に掛かっている |
| cresc./dim. の到達先 | info | テキスト式 cresc./dim. の後に到達先の強弱記号が現れない |

検出結果は「問題」タブにリスト表示され、クリックで該当小節・拍へジャンプします。

> 今後追加しうるチェック項目の網羅カタログ（実装可否・優先度・必要な SDK 拡張つき）は
> [`docs/notation-checklist.md`](./docs/notation-checklist.md)、
> 音高・拍子・楽器情報を IR に載せる段階プランは
> [`docs/sdk-extension-plan.md`](./docs/sdk-extension-plan.md) を参照。

## UI の機能

- **severity バッジ**（error / warning / info）のクリックで絞り込み
- **検索ボックス**（メッセージ・パート名）で絞り込み
- **パートフィルタ / ルールフィルタ**（ComboBox）
- **「問題をコピー」** でフィルタ後の一覧をクリップボードへ
- **スナップショットタブ** で LintIR（JSON）を確認・コピー（テスト fixture 作成用）
- **「アップデート確認」** で最新版をチェックし、新版があればダウンロード導線を表示（上記「アップデート方法」参照）

## ファイル構成

pnpm monorepo（`packages/core`・`checkers`・`musescore-api`）です。ビルド・テスト・リリースは Turborepo + Changesets で行います。

```
ScoreLinter.qml                プラグインエントリ（薄い）
qml/
  IssuesPanel.qml              問題タブ（バッジ・検索・フィルタ・空状態）
  SettingsPanel.qml            設定タブ（checker 一覧から自動生成）
  SnapshotPanel.qml            スナップショットタブ
  IssueDelegate.qml            問題 1 行の delegate
  SeverityBadge.qml            severity 色・カウントのバッジ
  UpdateBanner.qml             アップデート確認結果のバナー（DL / フォルダを開く導線）
src/
  bundle-entry.ts              esbuild の入口（core + checkers を束ね registerAll を呼ぶ）
packages/
  core/                        @musescore-linter/core — LintIR・linter・registry
    src/
      types.ts                 LintIR / LintEvent / Issue の型定義
      snapshot.ts              スコアを走査して LintIR を生成（buildSnapshot）
      linter.ts                全 checker を登録順に実行・ソート（runAllCheckers）
      checkerRegistry.ts       checker の登録・取得
      enumRegistry.ts          MuseScore enum を canonical 文字列へ正規化する層
      issue.ts                 Issue 生成（createIssue）とソート（compareIssues）
      logger.ts                タグ付きロガー
  checkers/                    @musescore-linter/checkers — 全 checker
    src/
      index.ts                 全 checker を registry に登録（registerAll：唯一の同期点）
      base/
        predicates.ts          共通述語（isDynamicMark 等）と buildPartBuckets
        textPairChecker.ts     on/off ペア型 checker のファクトリ
      pizzArcoChecker.ts       ┐
      sordinoChecker.ts        │
      soloTuttiChecker.ts      │ on/off ペア型（articulation・計 7 種）
      divisiChecker.ts         │
      sulTastoOrdChecker.ts    │
      sulPontOrdChecker.ts     │
      conLegnoArcoChecker.ts   ┘
      restAnnotationChecker.ts     休符アノテーション（独立）
      tempoBarlineChecker.ts       テンポ変更と複縦線（独立）
      openingTempoChecker.ts       冒頭テンポ表記（独立）
      firstNoteDynamicsChecker.ts  各パート冒頭ダイナミクス（独立）
      tempoWithoutBpmChecker.ts    BPM 値なしテンポ（独立）
      duplicateDynamicsChecker.ts  重複ダイナミクス（独立）
      finalBarlineChecker.ts       終止線の確認（独立）
      codaSegnoChecker.ts          コーダ/セーニョ整合性（独立）
    tests/
      checkers.test.ts         全 checker の単体テスト（vitest）
      helpers/irBuilder.ts     テスト用の簡易 LintIR ビルダ
  musescore-api/               @musescore-linter/musescore-api — SDK 型の薄い拡張層
    src/
      index.ts                 SDK 型に不足するプロパティ（duration / annotations 等）を補うブリッジ
scripts/
  build.ts                     esbuild で IIFE バンドル + QML を dist/ へ
  package.ts                   dist/ を ZIP 化（リリース成果物）
```

## 使い方

インストール後、チェックしたいスコアを開いた状態で **「プラグイン」→「Score Linter」** を起動し、「実行」ボタンを押すとチェックが始まります。

## 設定の永続化

設定は QML `Settings` の単一プロパティ `rulesJson`（JSON 文字列）に保存されます。
これにより新しい checker を追加しても QML を触る必要はありません（後述の追加手順参照）。

## 新しい checker の追加手順

詳細は `/checker-add` skill と `.claude/rules/checker-contract.md` を参照。

1. `packages/checkers/src/xxxChecker.ts` を作成し `export const xxxChecker = { ... }` を定義
   - 必須プロパティ: `id, name, description, category, severity, defaultEnabled, run(ir)`
   - Issue は `@musescore-linter/core` の `createIssue(checker, fields)` 経由で生成
   - on/off ペア型なら `packages/checkers/src/base/textPairChecker.ts` の `createTextPairChecker()` を利用
2. `packages/checkers/src/index.ts` の `registerAll()` に `import` と `register(xxxChecker)` を 1 行ずつ追加（**唯一の同期点**）
3. `packages/checkers/tests/checkers.test.ts` にテストを追加（fixture は `tests/helpers/irBuilder.ts` の `buildIR({...})` で構築）
4. README の「チェック項目」表を更新

**QML も `ScoreLinter.qml` も触る必要はありません。**設定 UI は checker のメタデータ一覧から自動生成されます。

## テストの実行

```bash
pnpm test   # 全パッケージで vitest を実行
```

各 checker は `tests/helpers/irBuilder.ts` で構築した最小 LintIR に対して挙動を検証します。MuseScore を起動せずに回帰テストが可能です。

## CI / リリースフロー

### CI

push または PR をオープンすると GitHub Actions が lint（Biome）・unused 検出（knip）・typecheck・テスト・ビルドを自動実行します。

### リリース手順

本プロジェクトは [Changesets](https://github.com/changesets/changesets) でバージョン管理をしています。

1. **変更内容を記録する**（機能追加・バグ修正の PR に含める）

   ```bash
   pnpm changeset
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
- 共有できる前処理（例: 各 staff の firstChord）は `ir.derived` に 1 回だけ計算して再利用する（`packages/core/src/linter.ts` の `ensureDerived` に追加）

## LintIR の概要

```ts
{
  events: [                      // 全イベントの単一配列（source of truth）
    { id, kind, type, tick, measure, staffIdx, voice, textNorm, textRaw, scope, barlineKind?, tempo?, duration?, ... }
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
    lastTick: number,
    hairpins: [{ staffIdx, startTick, endTick }]
  },
  registry: { canonical: { elementKinds, barlineKinds } },
  derived: {                     // 遅延初期化。linter.ts が 1 回だけ構築（_eventsCount で無効化判定）
    firstChordByStaff, annotationIdsByTick, globalAnnotationIdsByTick
  }
}
```

## 設計メモ

- `staves` / `unresolvedAnnotations` は廃止済み。global scope のイベントは `index.byStaff[-1]` で参照する。
- MuseScore API の列挙値は `packages/core/src/enumRegistry.ts` で canonical な文字列（`"chord"`, `"tempo_text"` など）へ正規化し、checker は文字列比較のみを行う。
- Issue 型は `@musescore-linter/core` の `createIssue(checker, fields)` で生成し、severity/category は checker のメタデータから自動付与。
- checker 単体で例外が出ても他の checker は実行継続し、`ruleId: "internal"` の issue として UI に表示される。

## 注意点

- 判定は記譜ルールの補助であり、最終判断は編曲・出版方針に合わせて行ってください。
- テキストの表記ゆれ（全角/半角、独自略語など）によっては検出できない場合があります。
</content>
</invoke>
