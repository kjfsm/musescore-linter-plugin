# @musescore-linter/cli

## 2.6.0

### Minor Changes

- [#157](https://github.com/kjfsm/score-linter/pull/157) [`37f10b7`](https://github.com/kjfsm/score-linter/commit/37f10b7cb4d52d10d2e71ee7a769d0352cfce3ec) Thanks [@kjfsm](https://github.com/kjfsm)! - チェック項目を追加しました。
  
  - 同音のスラー: 同じ音高の 2 音だけをスラーで結んでいる（タイの書き間違いの可能性）
  - タイの途中のスラー端点: スラーがタイで続く音から始まる、またはタイの途中で終わる
  - 重複したスラー: 同じ範囲にスラーが 2 本掛かっている
  - タイで続く音の強弱記号: タイで続くだけの音に強弱記号が付いている
  - 重なったヘアピン: 前のヘアピンが終わる前に次のヘアピンが始まっている
  - 休みのあとの強弱記号: 長く休んだあとの入りで強弱記号を言い直していない（休みの長さは 2 / 4 / 8 小節から選べます。既定は 4 小節）
  - テキストで書いた強弱記号: 「f」などを普通のテキストで書いている（再生に反映されません）
  - 重複・矛盾するテンポ表記: 同じ位置で BPM が違う、同じ位置に同じテンポを重ねている、変化を挟まずに同じテンポを言い直している、解除されないまま同じ rit. を重ねて書いている
  - リハーサルマークの位置: リハーサルマークが小節の頭に無い
  - 不要な臨時記号: 同じ小節で既に有効な臨時記号をもう一度付けている
  - 異名同音の不統一: 同じ音高を同時に、または同じ小節で続けて違う綴りで書いている
  - 休符のまとめ方: 拍の頭を隠す休符と、1 つにまとめられる休符
  - まとめられるタイ: 1 つの音符で書けるタイ
  - 調から遠い綴り: 調号から遠い綴り（ハ長調の B♯・C♭・重嬰・重変など）
  - 調号の書き方: 7 つの調号、前と同じ調号への変更
  - フェルマータの食い違い: 他のパートでフェルマータのある小節に、フェルマータが無いパート
  
  フェルマータは「同リズム間のスラー/タイ/アーティキュレーション」で比べなくなりました（「フェルマータの食い違い」が見ます）。MuseScore プラグインではもともとフェルマータを比べていなかったので、MusicXML（Web 版・CLI）の結果がプラグインと揃います。

- [#160](https://github.com/kjfsm/score-linter/pull/160) [`9a317cc`](https://github.com/kjfsm/score-linter/commit/9a317cc89fde3eac0082a73665ff6f268bd0aac7) Thanks [@kjfsm](https://github.com/kjfsm)! - チェック項目に段階（推奨・細かい指摘・試験中）を付け、プリセットでまとめて ON/OFF できるようにしました。
  
  - 既定では「推奨」（ほぼ確実な誤り）だけが動きます。設定画面のプリセットで「すべて」を選ぶと、「細かい指摘」（正しいが細かい・流派で分かれるもの）も動きます。
  - 「試験中」のチェックはどのプリセットにも入らず、設定画面の「試験中」の欄で 1 つずつ ON にしたときだけ動きます。
  - 設定画面では、話題のグループ（強弱など）ごとに「すべて ON / すべて OFF」できます。試験中のチェックには触れません。
  - CLI: `--preset=recommended|all` を足しました（既定は `recommended`）。`--rule=<id>` で試験中のルールも有効にできます。`--list-rules` は各ルールの段階を出します。
  
  今回のリリースで追加したチェックのうち、次のものは既定では動きません。
  
  - 試験中: 休みのあとの強弱記号・異名同音の不統一・調から遠い綴り・休符のまとめ方・まとめられるタイ・フェルマータの食い違い・タイの途中のスラー端点
  - 細かい指摘（プリセット「すべて」で動く）: タイで続く音の強弱記号・リハーサルマークの位置・不要な臨時記号・調号の書き方
  
  **既定で OFF になったチェック**: 次の 8 つは「細かい指摘」になり、既定では動かなくなりました。以前と同じように使うには、プリセットで「すべて」（CLI では `--preset=all`）を選ぶか、個別に ON にしてください。
  
  - 拍をまたぐ音符の分割（beat-crossing-tie）
  - 重複ダイナミクス（duplicate-dynamics）
  - 休符上のヘアピン端点（hairpin-on-rest）
  - BPM 値なしテンポ（tempo-without-bpm）
  - テンポ変更と複縦線（tempo-barline）
  - 単一音スラー（slur-single-note）
  - 親切臨時記号の提案（courtesy-accidental）
  - 同リズム間のスラー/タイ/アーティキュレーション（slur-tie-articulation-consistency）

### Patch Changes

- [#161](https://github.com/kjfsm/score-linter/pull/161) [`81f10fe`](https://github.com/kjfsm/score-linter/commit/81f10fe2d7ff5663f8b3efd5836d7fd9754720c0) Thanks [@kjfsm](https://github.com/kjfsm)! - 「リハーサルマークの順序」チェックが、AZ の後に BA, BB… と続く譜面で順序の逆転を誤検出していたのを直しました。Z の後を AA, AB, AC… と続ける譜面でも、AA, BB, CC… と続ける譜面でも、正しい順序なら指摘しません。

## 1.2.0

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

## 1.1.0

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

## 1.0.1

### Patch Changes

- Updated dependencies [[`eb72e66`](https://github.com/kjfsm/musescore-linter-plugin/commit/eb72e666a6311a73b59c5db02697be1ce75e559b)]:
  - @musescore-linter/core@2.4.0
  - @musescore-linter/checkers@2.4.0
  - @musescore-linter/source-musicxml@1.0.1
