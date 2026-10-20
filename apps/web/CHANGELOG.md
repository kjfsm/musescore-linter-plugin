# @musescore-linter/web

## 0.3.0

### Minor Changes

- [#149](https://github.com/kjfsm/score-linter/pull/149) [`d1d8d0a`](https://github.com/kjfsm/score-linter/commit/d1d8d0a36c96e5503308dfbdc1df3d98d89f5cfd) Thanks [@kjfsm](https://github.com/kjfsm)! - チェックの仕組みを作り直しました。チェックの結果は、次の点を除いて変わりません。
  
  - 指摘のメッセージにパート名と小節番号が入らなくなり、パート名は一覧の欄に 1 回だけ表示されます。小節番号は楽譜に表示されている番号で出します。
  - 同じ位置にある「f」と「f espr.」のように、修飾語だけが違う強弱記号は「同時ダイナミクスの衝突」として指摘しなくなりました。「p」と「f」のように記号が違えば、これまでどおり指摘します。
  - 奏法の指示の表記として「s.p.」「unison」「modo ordinario」「nat.」も読むようになり、前後の空白や大文字小文字の違いも同じ指示として扱います。
  - MuseScore プラグインで、「Allegro」のようにテンポの語で始まる譜表テキストをテンポ表記として扱います（MusicXML から読んだときと同じ扱いです）。
  - MuseScore プラグインの設定は、既定値から変えた項目だけを保存します。チェックの既定値が変わったとき、自分で変えていない項目には新しい既定値が効きます。
  - MuseScore プラグインのスナップショットタブと CLI の `--dump-ir`（新しい名前は `--dump-score`）が出力する内部データの形式が変わりました。
  - CLI に `--format=markdown` と `--format=csv` を足しました。GitHub アノテーションはメッセージの頭にパート名と小節番号を付けます。
  - Web 版で、結果を Markdown と CSV で書き出せるようにしました。ファイルはこれまでどおりどこにも送信されません。

## 0.2.0

### Minor Changes

- [#110](https://github.com/kjfsm/musescore-linter-plugin/pull/110) [`25271ee`](https://github.com/kjfsm/musescore-linter-plugin/commit/25271ee5aa7ac2352f2dbc4a022659412d957597) Thanks [@kjfsm](https://github.com/kjfsm)! - 同リズム間のスラー/タイ/アーティキュレーション整合の判定範囲を、スコアの括弧（システムブラケット）で絞れるようにした

  オーケストラスコアでは「Fl 1 と Vc がたまたま同リズム」といった無関係な組み合わせまで比較されてノイズになっていた。比較範囲を「全パート」「括弧内のみ」で切り替えられるようにし、区切りに使う括弧の種類（角括弧 / 括弧 / 大括弧 / 縦線）も選べるようにした。譜表を覆う最小の括弧が採用されるので、角括弧だけを選べば「木管全体」、括弧も選べば「Fl 1st/2nd のペア」単位で比較される。

  既定は今までどおり全パート比較なので、明示的に設定しない限り検出結果は変わらない。選んだ種類の括弧がスコアに 1 つも無い場合も全パート比較にフォールバックする。

  あわせて次の基盤を追加した。

  - `LintIR` の `meta.partGroups`（MusicXML の `<part-group>` と MuseScore の `Staff.brackets` の両方から構築）
  - checker が ON/OFF 以外の設定を受け取るための汎用オプション機構（`Checker.options` 宣言と `run(ir, options)`）。設定 UI は宣言から自動生成され、CLI では `--rule-option=<id>.<key>=<値>` で指定できる

  なお `brace`（大譜表）は MuseScore プラグイン経路でのみ有効。MusicXML では大譜表が `<part-group>` ではなく `<staves>` で暗黙表現されるため、Web 版と CLI では括弧として認識されない。

### Patch Changes

- Updated dependencies [[`25271ee`](https://github.com/kjfsm/musescore-linter-plugin/commit/25271ee5aa7ac2352f2dbc4a022659412d957597)]:
  - @musescore-linter/source-musicxml@1.1.0
  - @musescore-linter/checkers@2.5.0
  - @musescore-linter/core@2.5.0
  - @musescore-linter/cli@1.1.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`eb72e66`](https://github.com/kjfsm/musescore-linter-plugin/commit/eb72e666a6311a73b59c5db02697be1ce75e559b)]:
  - @musescore-linter/core@2.4.0
  - @musescore-linter/checkers@2.4.0
  - @musescore-linter/cli@1.0.1
  - @musescore-linter/source-musicxml@1.0.1
