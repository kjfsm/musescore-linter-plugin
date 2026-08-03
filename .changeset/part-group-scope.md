---
"@musescore-linter/source-musescore": minor
"@musescore-linter/source-musicxml": minor
"@musescore-linter/checkers": minor
"@musescore-linter/core": minor
"@musescore-linter/cli": minor
"@musescore-linter/web": minor
---

同リズム間のスラー/タイ/アーティキュレーション整合の判定範囲を、スコアの括弧（システムブラケット）で絞れるようにした

オーケストラスコアでは「Fl 1 と Vc がたまたま同リズム」といった無関係な組み合わせまで比較されてノイズになっていた。比較範囲を「全パート」「括弧内のみ」で切り替えられるようにし、区切りに使う括弧の種類（角括弧 / 括弧 / 大括弧 / 縦線）も選べるようにした。譜表を覆う最小の括弧が採用されるので、角括弧だけを選べば「木管全体」、括弧も選べば「Fl 1st/2nd のペア」単位で比較される。

既定は今までどおり全パート比較なので、明示的に設定しない限り検出結果は変わらない。選んだ種類の括弧がスコアに 1 つも無い場合も全パート比較にフォールバックする。

あわせて次の基盤を追加した。

- `LintIR` の `meta.partGroups`（MusicXML の `<part-group>` と MuseScore の `Staff.brackets` の両方から構築）
- checker が ON/OFF 以外の設定を受け取るための汎用オプション機構（`Checker.options` 宣言と `run(ir, options)`）。設定 UI は宣言から自動生成され、CLI では `--rule-option=<id>.<key>=<値>` で指定できる

なお `brace`（大譜表）は MuseScore プラグイン経路でのみ有効。MusicXML では大譜表が `<part-group>` ではなく `<staves>` で暗黙表現されるため、Web 版と CLI では括弧として認識されない。
