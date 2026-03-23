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
ScoreLinter.qml         プラグイン本体・UI（タブ: 問題 / 設定 / スナップショット）
snapshot.js             楽譜を走査してチェッカー向けスナップショットを生成
linter.js               チェッカーを集約して実行・結果をソート
checkers/
  CheckerBase.js        共通ユーティリティ・on/off ペアチェッカーのファクトリ
  PizzArcoChecker.js    pizz. / arco の対応チェック
  SordinoChecker.js     con sord. / senza sord. の対応チェック
  SoloTuttiChecker.js   solo / tutti の対応チェック
  DivisiChecker.js      div. / unis. の対応チェック
  RestAnnotationChecker.js  休符位置への記号チェック
  TempoBarlineChecker.js    テンポ変更前の複縦線チェック
  OpeningTempoChecker.js    冒頭テンポ表記チェック
  FirstNoteDynamicsChecker.js  各パート冒頭ダイナミクスチェック
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

### 優先度が高いルール例（弦楽五重奏寄り）

| ルール | 典型的ミス |
|---|---|
| pizz. / arco 対応 | pizz. のまま曲が終わる、別パートの arco をコピペして残る |
| con sord. / senza sord. 対応 | senza sord. を書き忘れる |
| div. / unis. 対応 | div. のまま後続のパートが書かれ unis. が抜ける |
| solo / tutti 対応 | solo 区間が閉じられない |
| 各パート冒頭ダイナミクス | Vn1 からコピーして他パートのダイナミクスを消し忘れ or 書き忘れ |
| 冒頭テンポ | テンポ表記ごと消してしまう |
| テンポ変更前の複縦線 | リハーサルマーク直前に複縦線を入れ忘れる |
| 休符位置への記号 | 休符の上に pizz./arco/強弱記号が付いている |

### 連桁（Beam）関連

**このプラグインでは対応しない。** 連桁調整は別プラグインで扱う。

---

## 新しいチェッカーを追加する手順

1. `checkers/` 以下に `XxxChecker.js` を作成する
   - on/off ペア型なら `CheckerBase.js` の `createTextPairChecker()` を再利用する
   - 単独チェック型なら `CheckerBase.js` のユーティリティ関数を参照する
2. `linter.js` の `getCheckerList()` にチェッカーを追加する
3. `ScoreLinter.qml` に設定トグル（`rule<Name>` の bool）とラベルを追加する
4. README.md を更新する

---

## スナップショット仕様（概要）

`snapshot.js` が生成するオブジェクト（チェッカーへの入力）:

```js
{
  parts: [...],         // パート名の配列
  staves: [...],        // スタッフ情報
  measures: [           // 小節ごとのデータ
    {
      measureNumber,
      startTick,
      endTick,
      barlineAtEnd,     // "double" | "other" | null
      staves: [
        {
          staffIdx,
          partIdx,
          annotations: [...],   // テキスト注記（tempo, staff text 等）
          elements: [...]        // 音符・休符
        }
      ]
    }
  ]
}
```

---

## 結果の severity 基準

| レベル | 用途 |
|---|---|
| `error` | 再生・出版に支障が出るレベルの漏れ（冒頭テンポなし、冒頭ダイナミクスなし等） |
| `warning` | on/off の対応漏れ（pizz. のまま終わる等） |
| `info` | あると望ましい記載の漏れ（複縦線等） |
