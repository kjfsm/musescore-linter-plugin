# score-linter

MuseScore 4 用の **楽譜チェック（Lint）プラグイン**です。
弦楽五重奏（Vn1・Vn2・Va・Vc・Cb）を主眼に、スコア内のテキスト指示・テンポ・ダイナミクスまわりを走査し、記譜ミスや整合性の崩れを一覧表示します。

## インストール方法

1. **[最新版の ZIP をダウンロード](https://github.com/kjfsm/score-linter/releases/latest/download/score-linter.zip)** し、ZIP を展開します。
   - ZIP URL: `https://github.com/kjfsm/score-linter/releases/latest/download/score-linter.zip`

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

段階は、どれだけ確実な誤りを指すかで、severity とは独立しています。既定で動くのは「推奨」（ほぼ確実な誤り）だけで、
設定画面のプリセットで「すべて」を選ぶと「細かい指摘」（正しいが細かい・流派で分かれるもの）も動きます。
「試験中」は誤検出の様子を見ているチェックで、どのプリセットにも入らず、1 つずつ ON にしたときだけ動きます。
プリセットを選んだうえで、ルールごと・話題のグループごとに ON/OFF できます。

<!-- rules:start -->

| ルール                                             | severity（最も重いもの） | 段階       | 目的                                                                                                                                                |
| -------------------------------------------------- | ------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pizz / Arco                                        | warning                  | 推奨       | `pizz.` 開始 → `arco` 解除の対応漏れ・重複                                                                                                          |
| Con sord. / Senza sord.                            | warning                  | 推奨       | 弱音器の対応漏れ・重複                                                                                                                              |
| Solo / Tutti                                       | warning                  | 推奨       | `solo`/`soli` → `tutti` の対応漏れ・重複（`tutti` を挟まない二連ソロは info）                                                                       |
| Div. / Unis.                                       | warning                  | 推奨       | `div.` → `unis.` の対応漏れ・重複                                                                                                                   |
| Sul tasto / Ord.                                   | warning                  | 推奨       | `sul tasto`（駒から離れた奏法）→ `ord.` 復帰の対応漏れ・重複                                                                                        |
| Sul pont. / Ord.                                   | warning                  | 推奨       | `sul pont.`（駒寄り奏法）→ `ord.` 復帰の対応漏れ・重複                                                                                              |
| Con legno / Arco                                   | warning                  | 推奨       | `con legno`（弓の木部奏法）→ `arco` 復帰の対応漏れ・重複                                                                                            |
| Mute / Open                                        | warning                  | 推奨       | 金管の `mute`/`straight mute` 等 → `open` 復帰の対応漏れ・重複                                                                                      |
| Una corda / Tre corde                              | warning                  | 推奨       | ピアノ左ペダル `una corda` → `tre corde` の対応漏れ・重複                                                                                           |
| Près de la table / Ord.                            | warning                  | 推奨       | ハープ `près de la table`（響板寄り奏法）→ `ordinario` 復帰の対応漏れ・重複                                                                         |
| 同リズム間のスラー/タイ/アーティキュレーション整合 | info                     | 細かい指摘 | 同じ小節で同じリズムのパート間でスラー・タイの有無やアーティキュレーションが食い違う（比較範囲を設定可、後述）                                      |
| 休符アノテーション                                 | error                    | 推奨       | 休符の位置に演奏技法テキストが付与されていないか（ダイナミクスは info）                                                                             |
| テンポ変更と複縦線                                 | info                     | 細かい指摘 | テンポ変更前の小節に複縦線があるか                                                                                                                  |
| 冒頭テンポ表記                                     | error                    | 推奨       | 曲頭にテンポ表記があるか                                                                                                                            |
| 各パート冒頭ダイナミクス                           | error                    | 推奨       | 各パートの 1 音目にダイナミクスがあるか                                                                                                             |
| BPM 値なしテンポ                                   | warning                  | 細かい指摘 | テンポ表記に BPM 値が未設定（再生テンポに反映されない）                                                                                             |
| テンポ変化の解除漏れ                               | warning                  | 推奨       | `rit.`/`accel.` 等が `a tempo`/新テンポで解除されないまま終わる                                                                                     |
| 重複・矛盾するテンポ表記                           | warning                  | 推奨       | 同じ位置で BPM の違うテンポ表記（warning）、同じ位置の重ね書き、変化を挟まない同じ BPM の言い直しや、解除されないまま重ねて書いた `rit.` 等（info） |
| 重複ダイナミクス                                   | info                     | 細かい指摘 | 同パートで同じ強弱記号が変化なく連続している箇所（`sf`/`rf` の連続は許可）                                                                          |
| 同時ダイナミクスの衝突                             | warning                  | 推奨       | 同じ位置に異なる強弱記号が同時に付いている                                                                                                          |
| テキストで書いた強弱記号                           | warning                  | 推奨       | 「f」「mp」などを強弱記号ではなく普通のテキストで書いている（再生に反映されない）                                                                   |
| 休みのあとの強弱記号                               | info                     | 試験中     | 長く休んだあとの入りで強弱記号を言い直していない（休みの長さを設定可、後述）                                                                        |
| ヘアピンの到達先ダイナミクス                       | info                     | 推奨       | crescendo/diminuendo の終端に到達先のダイナミクスが無い（曲尾のヘアピンは除外）                                                                     |
| 重なったヘアピン                                   | warning                  | 推奨       | 同じ譜表で前のヘアピンが終わる前に次のヘアピンが始まっている                                                                                        |
| 終止線の確認                                       | info                     | 推奨       | 曲末の最終 barline が終止線になっているか                                                                                                           |
| コーダ/セーニョ整合性                              | error                    | 推奨       | `D.S.`/`D.C.` と `Segno`/`Coda`/`Fine` の対応（参照先マークの欠落）                                                                                 |
| リハーサルマークの順序                             | info                     | 推奨       | リハーサルマークの順序逆転・重複                                                                                                                    |
| リハーサルマークの位置                             | info                     | 細かい指摘 | リハーサルマークが小節の頭に無い                                                                                                                    |
| リピート小節線の対応                               | warning                  | 推奨       | リピート開始(‖:)に対応する終了(:‖)が無い（終了のみは曲頭反復として許容）                                                                            |
| 異音程のタイ                                       | warning                  | 推奨       | 異なる音高をタイで結んでいる（スラーの書き間違いの可能性）                                                                                          |
| 同音のスラー                                       | warning                  | 推奨       | 同じ音高の 2 音だけをスラーで結んでいる（タイの書き間違いの可能性。アーティキュレーションがあればポルタートとして許容）                             |
| 親切臨時記号の提案                                 | info                     | 細かい指摘 | 前小節で臨時記号が付いた音が次小節で記号なしで再び現れる箇所に親切記号を提案                                                                        |
| 不要な臨時記号                                     | info                     | 細かい指摘 | 同じ小節で既に有効な臨時記号をもう一度付けている（調号による不要は見ない）                                                                          |
| 異名同音の不統一                                   | info                     | 試験中     | 同じパートの同じ位置、または同じ声部の同じ小節で続く同じ音高を違う綴りで書いている                                                                  |
| 調から遠い綴り                                     | info                     | 試験中     | 調号から遠い綴り（ハ長調の B♯・C♭・重嬰・重変など）。異名同音で書くと読みやすい                                                                     |
| 調号の書き方                                       | info                     | 細かい指摘 | 7 つの調号、前と同じ調号への変更                                                                                                                    |
| フェルマータの食い違い                             | warning                  | 試験中     | 他のパートでフェルマータのある小節に、フェルマータが無いパート                                                                                      |
| 休符上のヘアピン端点                               | info                     | 細かい指摘 | ヘアピン(cresc./dim.)の端点が休符上にある（同 tick に音符があれば許容）                                                                             |
| 休符上のスラー端点                                 | warning                  | 推奨       | スラーの端点が休符上にある（同 tick に音符があれば許容）                                                                                            |
| 単一音スラー                                       | info                     | 細かい指摘 | スラーが単一音（開始 tick == 終了 tick）に掛かっている                                                                                              |
| タイの途中のスラー端点                             | info                     | 試験中     | スラーがタイで続く音から始まる、またはタイの途中で終わる                                                                                            |
| 重複したスラー                                     | info                     | 推奨       | 同じ声部の同じ範囲にスラーが 2 本掛かっている                                                                                                       |
| タイで続く音の強弱記号                             | info                     | 細かい指摘 | タイで続くだけの音（新しく弾かない音）に強弱記号が付いている                                                                                        |
| cresc./dim. の到達先                               | info                     | 推奨       | テキスト式 cresc./dim. の後に到達先の強弱記号が現れない                                                                                             |
| 拍をまたぐ音符の分割                               | warning                  | 細かい指摘 | 拍境界をまたぐ音符（小節の中央またぎは小節頭始まりのみ許容し warning）。分割案を提示                                                                |
| まとめられるタイ                                   | info                     | 試験中     | 1 つの音符で書けるタイ（まとめても拍をまたがず、後ろの音に記号が無いときだけ）                                                                      |
| 休符のまとめ方                                     | info                     | 試験中     | 拍の頭を隠す休符と、拍・小節の半分・小節全体を 1 つにまとめられる休符                                                                               |

<!-- rules:end -->

検出結果は「問題」タブにリスト表示され、クリックで該当小節・拍へジャンプします。

### チェック項目ごとの設定

一部のルールは ON/OFF に加えて設定値を持ちます。設定タブ（プラグイン / Web 版）に
自動で入力欄が出るほか、CLI では `--rule-option=<id>.<key>=<値>` で指定できます
（指定できる key は `--list-rules` で確認できます）。

**同リズム間のスラー/タイ/アーティキュレーション整合**の比較範囲:

| key            | 値                                                 | 既定             | 意味                                                               |
| -------------- | -------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| `scope`        | `all` / `group`                                    | `all`            | `group` にするとスコアの括弧（システムブラケット）内だけを比較する |
| `groupSymbols` | `bracket` / `square` / `brace` / `line` の複数選択 | `bracket,square` | 区切りに使う括弧の種類。譜表を覆う**最小の**括弧が採用される       |

オーケストラスコアなら、`bracket` だけを選べば「木管全体」「金管全体」「弦全体」の単位、
`bracket,square` なら「Fl 1st/2nd のペア」単位で比較されます。どの括弧にも属さないパート
（例: Timpani）は比較対象から外れます。**選んだ種類の括弧がスコアに 1 つも無ければ、
全パート横断で比較します**（括弧を持たない楽譜で無検出にならないようにするため）。

> `brace`（ピアノ・ハープの大譜表）は **MuseScore プラグイン経路でのみ**効きます。MusicXML では
> 大譜表が `<part-group>` ではなく `<staves>` で暗黙表現されるため、Web 版と CLI では `brace` を
> 選んでも括弧として認識されません（結果として全パート横断へフォールバックします）。

**休みのあとの強弱記号**の休みの長さ:

| key            | 値              | 既定 | 意味                                                 |
| -------------- | --------------- | ---- | ---------------------------------------------------- |
| `restMeasures` | `2` / `4` / `8` | `4`  | この小節数以上、音の無い小節が続いたあとの入りを見る |

> 今後追加しうるチェック項目のカタログ（作るもの・作らないものと理由）は
> [`docs/notation-checklist.md`](./docs/notation-checklist.md) を参照。

## UI の機能

- **severity バッジ**（error / warning / info）のクリックで絞り込み
- **検索ボックス**（メッセージ・パート名）で絞り込み
- **パートフィルタ / ルールフィルタ**（ComboBox）
- **スナップショットタブ** で読み込んだ楽譜のモデル（Score の JSON）を確認・コピー（テスト fixture 作成用）
- **「コピー」** でフィルタ後の一覧をクリップボードへ（テキスト・Markdown・CSV。Web 版は Markdown / CSV のファイル書き出し）
- **「アップデート確認」** で最新版をチェックし、新版があればダウンロード導線を表示（上記「アップデート方法」参照）

## ファイル構成

pnpm monorepo です。ビルド・テスト・リリースは Turborepo + Changesets で行います。

楽譜を **読む側**（reader）と **検査する側**（ルール）が分かれているのが構成の要点です。
ルールは MuseScore を知らず、`score-model` の `Score` だけを見ます。同じ `Score` を MuseScore からも
MusicXML からも組み立てられるので、QML プラグイン・CLI・Web 版のどれからでも同じルールが動きます。

| 場所                                                        | 中身                                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/plugin`                                               | MuseScore プラグイン（QML と、esbuild で作る ES2017 のバンドル）                    |
| `apps/cli`                                                  | `score-lint` コマンド（MusicXML / .mxl）                                            |
| `apps/web`                                                  | ブラウザ完結の Web 版（Cloudflare Workers の static assets）                        |
| `packages/score-model`                                      | ソースに依存しない楽譜モデル（Score）・問い合わせ関数・注記の解釈・テスト用ビルダー |
| `packages/reader-musicxml`                                  | MusicXML / .mxl → Score                                                             |
| `packages/reader-musescore`                                 | 実行中の MuseScore → Score                                                          |
| `packages/linter`                                           | ルールの定義（`defineRule`）・エンジン（`createLinter`）・組み込みのルール          |
| `packages/lint-app`                                         | 設定・並べ替え・件数・出力の整形・スナップショットの書き手（ホスト共通）            |
| `packages/musescore-api-types` / `musescore-plugin-helpers` | MuseScore プラグイン API の型とヘルパ                                               |
| `tools/musescore-api-types-generator`                       | MuseScore の C++ ヘッダから `musescore-api-types` を生成する                        |
| `tools/rule-docs`                                           | ルールの `meta` から README の「チェック項目」表を作る（`pnpm docs:rules`）         |
| `tools/bench`                                               | 手元で回すベンチマーク（`pnpm bench`）                                              |
| `scripts/`                                                  | CI 用の補助スクリプト                                                               |

## 使い方

インストール後、チェックしたいスコアを開いた状態で **「プラグイン」→「Score Linter」** を起動し、「実行」ボタンを押すとチェックが始まります。

## CLI（MusicXML / .mxl）

MuseScore を起動せずに、MusicXML から同じルールをかけられます。

```bash
pnpm build:cli                             # apps/cli/dist/score-lint.mjs を作る
./apps/cli/dist/score-lint.mjs score.musicxml

pnpm lint:score score.musicxml             # ビルドせずに直接実行（Node の型除去）
```

```
--format=<pretty|json|github|markdown|csv>
                               出力形式（既定: pretty。github は Actions のアノテーション）
--json                         --format=json の別名
--dump-score                   指摘ではなく、読み込んだ Score を JSON 出力
                               （1 ファイルなら Score そのもの、複数なら [{ file, score }] の配列。
                               --dump-ir は別名）
--preset=<recommended|all>     既定で動かす段階（既定: recommended。all は細かい指摘も含む）
--rule=<id> / --no-rule=<id>   ルールの絞り込み（複数指定可）。--rule は試験中のルールも有効にできる
--rule-option=<id>.<key>=<値>  ルール個別の設定（複数指定可、同じキーは後勝ち）
                               複数選択の値はカンマ区切り。指定できる key は --list-rules で確認
--fail-on=<error|warning|info|none>
                               この severity 以上で終了コード 1（既定: error）
--list-rules                   ルールの一覧（段階と設定できる項目もあわせて表示）
```

全オプションは `score-lint --help`。終了コードは 0（閾値以上の指摘なし）/ 1（あり）/ 2（実行エラー）です。

`--dump-score` の出力は、プラグインのスナップショットタブがコピーする Score と同じ形式なので、
**MuseScore 経路と MusicXML 経路の突き合わせ**に使えます。

## Web 版（ブラウザ完結）

MusicXML をドラッグ&ドロップすると、その場で同じルールが走り、OSMD (OpenSheetMusicDisplay) による
楽譜プレビューも見られます（各ファイルの「楽譜プレビュー」を開くと表示、既定では閉じています）。
MuseScore も Node も要りません。結果は Markdown / CSV でも書き出せます（ブラウザの中でファイルを作るだけで、通信はしません）。

**読み込んだファイルはサーバーに送信されません。** このサイトは Cloudflare Workers の
static assets だけで構成されており、`wrangler.jsonc` に `main` を書いていないため
**リクエストを受け取る Worker スクリプトが存在しません**。受け取る側のコードが無い、というのが
「送信されない」ことの根拠です。

加えて配信時のセキュリティヘッダで `connect-src 'none'` を指定しているため、ページからの
fetch / XHR / WebSocket / sendBeacon がブラウザレベルで禁止されています。CI では Playwright で
`wrangler dev`（`_headers` の CSP ごと配信）を開き、楽譜を読み込んで lint させたうえで、
外への通信と CSP 違反が 0 件であることを確かめています（`apps/web/e2e/privacy.spec.ts`、`pnpm --filter @score-linter/web test:e2e`）。
OSMD のような第三者のコードも含めて、実際にブラウザで動いたときの通信を見ます（OSMD 自体は URL 文字列を
渡したときのみ内部で通信ヘルパーを使うコード経路を持ちますが、Web 版では常に読み込み済みの MusicXML
文字列を直接渡すため、そのコード経路は実行されません）。

```bash
pnpm dev:web        # Vite の開発サーバー（_headers は再現されない）
pnpm build:web      # apps/web/dist を生成
pnpm preview:web    # wrangler dev。_headers が適用された状態で確認できる
pnpm deploy:web     # Cloudflare へデプロイ（手動）
```

CSP の `style-src 'self'`（`'unsafe-inline'` なし）を維持するため、UI には制約があります。

- `style` 属性・インライン `<script>` を書かない
- インラインスタイルを注入する Radix 系（Popover / Select / Dialog / Tooltip / Accordion）を使わない。
  折りたたみはネイティブ `<details>` で代替する
- Vite の `build.modulePreload.polyfill` は `false`（既定ではインライン `<script>` を吐く）

対応形式は `.musicxml` / `.xml` / `.mxl` です。`.mscz` は MuseScore 独自形式のため読めません
（MuseScore から MusicXML で書き出してください）。

### MusicXML 経路の既知の差分

どちらの読み込み口でも同じ `Score` になることは、duet の MuseScore 版のモックと MusicXML 版の
fixture を突き合わせるテスト（`apps/plugin/tests/conformance.test.ts`）で確かめています。
実際の楽譜では次の差が出ます。

- `tempo-without-bpm` は、MuseScore が書き出した MusicXML ではほぼ発火しません。書き出し時に
  テンポ表記へ `<sound tempo>` を必ず付けるためです。逆に Sibelius / Finale などが書き出した
  「テンポ語だけで BPM を持たない」MusicXML では発火します。
- アーティキュレーション名は英語の MuseScore 名（`Staccato` 等）になります。日本語 UI の
  MuseScore が返す名前とは文字列が異なりますが、これを使う
  `slur-tie-articulation-consistency` は同一 Score 内のパート間比較しかしないため判定は変わりません。
- `Note.line`（譜表位置）は「最上線を 0、下方向へ 1 ステップ +1」で算出します。MuseScore
  内部の採番と原点が違う可能性がありますが、これを使う `courtesy-accidental` は同一譜表内の
  一致判定しかしないため判定は変わりません。
- MuseScore で書き出した MusicXML は、MuseScore 自身が記譜を正規化したあとの姿です
  （例: 異音程のタイは取り込み時に `let-ring` へ変換され、`tie-pitch-mismatch` は出なくなる）。
- パート括弧（`<part-group>`）はスコアによっては書き出されません。その場合
  `Score.partGroups` は空になり、比較範囲を「括弧内のみ」にしても全パート横断で判定されます。

## 設定の永続化

設定は「既定値から変えた分だけ」を JSON で保存します（`packages/lint-app` の `createLintApp` が返す `serializeSettings` /
`parseSettings`）。ルールの既定値を変えても、触っていない設定には新しい既定値が効きます。
未知のルール・キーや型の合わない値は読み込み時に捨てて既定値に戻します。

ON/OFF の既定値は、選んだプリセットとルールの段階から決まります。保存するのは、そのプリセットのもとでの既定値との差分だけで、
プリセットを切り替えると、切り替え後の既定値と同じになった個別の設定は消えます。

- プラグイン: QML の 3 つのプロパティ `rulesJson`（ルールの ON/OFF）・`ruleOptionsJson`（ルール個別の設定）・`preset`（プリセット）に保存します。
  新しいルールを足しても QML は触りません。
- Web 版: localStorage の `musescore-linter:rule-overrides`・`musescore-linter:rule-options`・`musescore-linter:preset` に保存します。

> プラグイン側の保持先は `QtObject` なので、**設定はプラグインを閉じると消えます**（セッション内のみ）。
> セッションをまたいで残したい場合は `Qt.labs.settings` の `Settings` に置き換える必要があります。

## 新しいルールの追加手順

詳細は `/rule-add` skill と `.claude/rules/rule-contract.md` を参照。

1. `packages/linter/src/rules/<export 名>.ts` に 1 ルール 1 ファイルで、
   `defineRule({ id, meta, options, messages, examples, run })` を定義する。指摘は `run` の
   `report({ at, messageId, data, detail })` で返し、文面は `messages` に置く。`meta.docs` に README の「目的」欄を書き、
   `examples` に指摘が出る楽譜（invalid）と出ない楽譜（valid）を 1 つ以上ずつ書く。
   新しい奏法の on/off ペアなら `support/techniquePairs.ts` の `techniquePair()` に設定を渡す
   （奏法の表記は `packages/score-model/src/interpret.ts` が解釈する）
2. `packages/linter/src/rules/index.ts` の `builtinRules` に足す。並びがそのまま実行順・設定画面の並び・README の表の並びに
   なるので、関連するペアの隣に入れる
3. 境界のケースを `packages/linter/tests/` の話題の近いテストファイルに、`tests/helpers.ts` の `cleanScore()` と
   `runRule()` で書く（`examples` は `tests/examples.test.ts` が全ルールまとめて回す）
4. `pnpm docs:rules` で README の「チェック項目」表を作り直す（CI が生成物との差分を見る）

新しいルールは段階（`meta.tier`）を `nursery`（試験中）で入れ、実際の楽譜で誤検出の様子を見てから
`recommended` か `pedantic` に上げます。上げるときは `tier` を書き換え、changeset に書きます。

**QML も `ScoreLinter.qml` も Web の UI も触る必要はありません。**設定 UI は各ルールの `meta` と `options` から自動生成されます。

## テストの実行

```bash
pnpm test     # 全パッケージで vitest を実行（カバレッジの閾値つき）
pnpm verify   # 検証ゲート全体（CI と同じ）
pnpm generate:types   # MuseScore の C++ ヘッダから packages/musescore-api-types を生成し直す（版は tools/musescore-api-types-generator/config.json の ref）
```

ルールは `buildScore()` で組んだ最小の `Score` に対して検証します。MuseScore を起動せずに回帰テストが可能です。
CLI の `apps/cli/tests/golden.test.ts` は、3 曲の検出結果を `fixtures/golden/` と突き合わせます。

## CI / リリースフロー

### CI

push または PR をオープンすると GitHub Actions が `pnpm verify`（層の境界・lint / フォーマット・unused 検出・README の生成物・typecheck・テストとカバレッジ・ビルド・Web 版の E2E）を実行します。あわせて、出荷するプラグインのバンドルを MuseScore と同じ版の Qt の QJSEngine で動かし（`apps/plugin/qjs/`）、QML を qmllint で検査します。

### 楽譜の Lint（`.github/workflows/score-lint.yml`）

`scores/` に置いた `.mscz` を MuseScore の CLI で MusicXML に変換し、`score-lint` にかけます。
`.musicxml` / `.mxl` を直接置いた場合は変換せずそのまま解析します。error があればワークフローが
失敗し、issue は PR にアノテーションとして表示されます。

セットアップ上の注意点（いずれも実際に検証済み）:

- **MuseScore 4 は `QT_QPA_PLATFORM=offscreen` では起動しません。** CLI 実行でも Qt の xcb
  プラットフォームを要求するため、`xvfb-run` で仮想ディスプレイを与える必要があります。
- **Linux 版の公式配布は AppImage のみで、runner には FUSE がありません。**
  `--appimage-extract` で展開したバイナリを直接実行します。
- `libegl1` / `libopengl0` / `libxcb-cursor0` が無いと起動に失敗します。
- 変換結果は MuseScore の版で変わるため、バージョンを固定してキャッシュしています。

```bash
# 手元で同じことをする場合
xvfb-run -a /path/to/squashfs-root/AppRun -o out.musicxml score.mscz
./apps/cli/dist/score-lint.mjs out.musicxml
```

### リリース手順

本プロジェクトは [Changesets](https://github.com/changesets/changesets) でバージョン管理をしています。
プラグイン・CLI・Web 版は同じルールを動かす 1 つの製品として、同じ版で上がります（`.changeset/config.json` の `fixed`）。
`packages/*` と `tools/*` は公開しないので版を持ちません。

1. **変更内容を記録する**（機能追加・バグ修正の PR に含める）

   ```bash
   pnpm changeset
   # patch / minor / major を選択し、変更内容を入力
   # .changeset/*.md が生成されるのでコミットに含める
   ```

2. **main にマージする**
   - GitHub Actions がバージョン変更用の **「バージョンアップ」PR** を自動作成します。

3. **「バージョンアップ」PR をマージする**
   - `package.json` のバージョンが自動で更新され、検証ゲート（`pnpm verify`）を通したビルドから
     GitHub Release（zip 添付）が作成されます。zip にはビルド来歴の証明（`gh attestation verify <zip> -R kjfsm/score-linter`）が付きます。

## パフォーマンスガイド

ルールで楽譜を引くときは、`score-model` の問い合わせ関数（`annotationsOn`・`chordsOnStaff`・`slursOn` など）を使います。
結果は `Score` ごとに `WeakMap` で覚えられ、使われた分だけ計算されるので、複数のルールが同じ問い合わせをしても
前処理は 1 回です。`score.staves[i].voices` を全ルールが毎回走査するのは避けてください。

## Score の概要

`Score` は、パート・譜表（声部ごとの音符と休符、小節線）・小節・スパナー（スラー・タイ・ヘアピン）・
括弧・注記を持つ純データです。注記には、テキストを解釈した `Directive`（奏法・強弱・テンポ・反復記号など）が付きます。
型の定義は `packages/score-model/src/types.ts`。

- 位置は譜表・小節の通し番号（`serial`）・tick で指します。楽譜に表示されている小節番号（`label`）はアウフタクトなどで
  通し番号とずれるので、表示のときだけ使います。
- ルールのメッセージにはパート名と小節番号を入れません。他の位置を指したいときは `{{measure:key}}`・`{{part:key}}`
  のプレースホルダで `detail` の値を指し、表示時に `lint-app` が解決します。
- ルールが例外を投げても他のルールは実行され、`ruleId: "internal"` の指摘として表示されます。
  `meta.severity` より重い指摘を報告した場合も内部エラーになります。

## 注意点

- 判定は記譜ルールの補助であり、最終判断は編曲・出版方針に合わせて行ってください。
- テキストの表記ゆれ（全角/半角、独自略語など）によっては検出できない場合があります。
