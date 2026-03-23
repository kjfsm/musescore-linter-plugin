# musescore-linter-plugin

MuseScore 3 用の **楽譜チェック（Lint）プラグイン**です。  
スコア内のテキスト指示やテンポ変更まわりを走査し、見落としや整合性の崩れを一覧表示します。

## 主な機能

- `pizz.` / `arco` の対応チェック
- `con sord.` / `senza sord.` の対応チェック
- `solo` / `tutti` の対応チェック
- `div.` / `unis.` の対応チェック
- 休符位置へのテキスト指示（※強弱記号相当は除外）チェック
- テンポ変更前小節の複縦線チェック
  - 複縦線は `BarLineType.DOUBLE`（スナップショット正規化値: `"double"`）を対象として判定します。

検出結果はプラグインダイアログの「問題」タブに表示され、クリックで該当箇所へのジャンプを試みます。

## ファイル構成

- `ScoreLinter.qml` : プラグイン本体 UI
- `snapshot.js` : スコア情報を走査し、チェッカー向けスナップショットを生成
- `enumRegistry.js` : MuseScore API の列挙値を checker 用の canonical enum に正規化
- `linter.js` : チェッカーの集約・実行
- `checkers/*.js` : 各ルールの実装

## ルール実装の性能ガイド

新しい checker / ルールを追加するときは、**必ず `index` を利用**してください。

- `ir.index.byKind[...]` / `ir.index.byStaffAndKind[...]` / `ir.index.byTick[...]` を起点に、必要なイベントだけ処理する。
- `ir.events` の全件ループや、`staff.events` を毎回なめる実装は避ける。
- 共有できる前処理（例: 各 staff の firstChord、tick ごとの注記集合）は `ir.derived` に 1 回だけ計算して再利用する。

この方針により、ルール追加時にチェック時間が直線的に悪化するのを防ぎます。

## enum正規化層

`enumRegistry.js` の `buildEnumRegistry(E)` が、QML 側（`ScoreLinter.qml`）から受け取る
`Element` / `BarLineType` 列挙値を、checker 側で共通利用する canonical enum へ変換します。

- `canonical.elementKinds`
  - `CHORD / REST / BAR_LINE / TEMPO_TEXT / STAFF_TEXT / SYSTEM_TEXT / EXPRESSION / REHEARSAL_MARK / DYNAMIC`
- `canonical.barlineKinds`
  - `DOUBLE / OTHER / UNKNOWN`
- 変換関数
  - `resolveElementKind(rawType)`
  - `resolveBarlineKind(rawBarlineType)`

この層により、MuseScore API の差分（列挙値の変化や一部未解決）を checker 実装から分離できます。
`BARLINE_DOUBLE === 2` のような数値フォールバックは registry 内部に閉じ込め、各 checker は
`ev.kind === registry.canonical.*` の比較のみを行います。

## 使い方

1. MuseScore 3 で本リポジトリのファイルをプラグインディレクトリに配置します。  
   （`ScoreLinter.qml` を含む構成のまま置いてください）
2. MuseScore の `Plugins > Plugin Manager` で **Score Linter** を有効化します。
3. 対象スコアを開き、`Plugins > Score Linter` を実行します。
4. 「実行」ボタンでチェックを開始します。

## 注意点

- 本プラグインは MuseScore 3 系の QML プラグイン API を前提にしています。
- 判定は記譜ルールの補助であり、最終判断は編曲・出版方針に合わせて行ってください。
- テキストの表記ゆれ（全角/半角、独自略語など）によっては検出できない場合があります。

## ライセンス

必要に応じて追記してください。
