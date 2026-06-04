# 楽譜浄書チェック項目カタログ

楽譜浄書（engraving）の観点で、本プラグインに追加しうる **チェック項目の網羅カタログ**。
次ステップで取捨選択・優先度確定・実装する前提で、**実現できないものや優先度の低いものもあえて残してある**。

## 方針

- MuseScore の自動チェックで回避できるもの（拍合計の不一致、音域逸脱など）は **優先度低 / 対象外**。
- 「その書き方は基本的に間違い」（休符にフォルテ 等）を重視。
- **弦楽器以外**（木管・金管・鍵盤・ハープ・打楽器・声楽）に範囲を広げる。
- 音域は MuseScore で見られるので不要。

## タグ凡例

| タグ | 意味 |
|---|---|
| `NOW` | 現行 LintIR だけで実装可能 |
| `SDK` | SDK 拡張（音高・拍子・楽器情報など）が必要。必要データを備考に明記 |
| `MS` | MuseScore が自動で検出できる → 優先度低 or 対象外 |
| ✅ | 既存実装あり / このバッチで実装済み |

## 現行 LintIR で取れるデータ（実装可否の根拠）

`packages/core/src/snapshot.ts` が `Score` を走査して `LintEvent` を生成する。

- **取れる**: chord/rest（tick・measure・staffIdx・voice・duration・stemDirection・beamMode・articulations[]）、
  text 系（tempo_text・dynamic・staff_text・system_text・expression・rehearsal_mark の textNorm/textRaw/tempo/subtype）、
  barline（barlineKind = double/final/repeat/other）、`meta.hairpins[]`、`meta.slurs[]`、`meta.parts[]`（partName のみ）。
- **取れない**: 音高（pitch/tpc/octave/臨時記号）、拍子、調号、音部記号、楽器メタ情報
  （instrumentId・楽器族・移調・MIDI program・有/無音程）、タイ、連符、装飾音、歌詞、グリッサンド/トレモロ、
  リピートの開始/終了の区別（現状 `repeat` に一括）。

---

## A. ダイナミクス / ヘアピン

| # | 項目 | タグ | severity | 優先 | 状態 | 備考 |
|---|---|---|---|---|---|---|
| A1 | 休符にダイナミクス | NOW | error | – | ✅ | 既存 `rest-annotation` |
| A2 | ヘアピン（cresc/dim）の到達先ダイナミクスが無い | NOW | warning | 高 | ✅ | このバッチ `hairpin-target-dynamic` |
| A3 | ヘアピンが休符上で開始/終了 | NOW | warning | 中 | | hairpin tick と rest tick 照合 |
| A4 | `cresc.`/`dim.`/`decresc.` テキストの後に強弱変化が無い | NOW | info | 中 | | text→後続 dynamic |
| A5 | 同一 tick・同 staff に異なるダイナミクスが同時 | NOW | warning | 中 | ✅ | このバッチ `simultaneous-dynamics` |
| A6 | 重複ダイナミクス | NOW | info | – | ✅ | 既存 `duplicate-dynamics` |
| A7 | `sf`/`fp`/`sfz` 等が文脈なく単独連続 | NOW | info | 低 | | textNorm パターン |

## B. テンポ / ルバート

| # | 項目 | タグ | severity | 優先 | 状態 | 備考 |
|---|---|---|---|---|---|---|
| B1 | `rit.`/`rall.`/`accel.` の後に `a tempo`/新テンポが無い | NOW | warning | 高 | ✅ | このバッチ `tempo-change-resolution`（後続の新テンポ表記も解除とみなす） |
| B2 | 冒頭テンポ表記 | NOW | error | – | ✅ | 既存 `opening-tempo` |
| B3 | BPM 値なしテンポ | NOW | warning | – | ✅ | 既存 `tempo-without-bpm` |
| B4 | テンポ変更前の複縦線 | NOW | info | – | ✅ | 既存 `tempo-barline` |
| B5 | 同一 tick に複数テンポ表記 | NOW | info | 低 | | byTick |

## C. 奏法テキスト on/off ペア（弦 + 非弦）

すべて `createTextPairChecker` で安価に追加可能。

| # | ペア | 楽器 | タグ | severity | 優先 | 状態 |
|---|---|---|---|---|---|---|
| C1–C7 | pizz/arco・con sord/senza sord・solo/tutti・div/unis・sul tasto/ord・sul pont/ord・con legno/arco | 弦 | NOW | warning | – | ✅ 既存 |
| C8 | `mute`/`open`・`straight/cup/harmon mute`・`stopped`/`open` | 金管 | NOW | warning | 高 | ✅ このバッチ `mute-open`（C9/H2 を統合） |
| C9 | （C8 に統合） | 金管 | NOW | – | – | ✅ |
| C10 | `con sord.`/`senza sord.` を木管・金管にも適用 | 木管/金管 | NOW | – | – | ✅ 既存 `sordino` で楽器非依存にカバー済み |
| C11 | `una corda`/`tre corde` | 鍵盤 | NOW | warning | 高 | ✅ このバッチ `una-corda` |
| C12 | `Ped.`/`*`（テキスト式ペダル踏み/離し） | 鍵盤 | NOW / MS | warning | 中 | MuseScore のペダルライン使用時は不要 |
| C13 | `près de la table`/`ordinario` | ハープ | NOW | warning | 中 | ✅ このバッチ `harp-table` |
| C14 | `flz.`（フラッター） | 木管/金管 | NOW | info | 中 | 明示的な解除を持たないことが多く on/off モデルに不向き。要検討 |
| C15 | `senza vibrato`/`vibrato` | 弦/管 | NOW | info | 低 | ノイズになりやすい |
| C16 | `bisbigliando`/通常 | ハープ | NOW | info | 低 | |

## D. 「基本的に間違い」系（記譜の禁則）

| # | 項目 | タグ | severity | 優先 | 状態 | 備考 |
|---|---|---|---|---|---|---|
| D1 | 休符に奏法テキスト/ダイナミクス | NOW | error | – | ✅ | 既存 `rest-annotation`。語彙拡充の余地 |
| D2 | 休符にスラー/ヘアピンの端点 | NOW | warning | 中 | | A3 と連動 |
| D3 | スラーが単一音（start==end） | NOW | info | 中 | | `meta.slurs` |
| D4 | グリッサンド/タイの端点が休符 | SDK | warning | 中 | | 要: タイ/グリッサンド span |
| D5 | タイの途中音に新ダイナミクス/アーティキュレーション | SDK | warning | 中 | | 要: タイ情報 |
| D6 | 異音程をタイで結んでいる（スラーにすべき） | SDK | warning | 高 | ✅ | `tie-pitch-mismatch`。checker は実装済み（snapshot 配線は SDK helpers 公開後・`docs/sdk-extension-plan.md`） |
| D7 | 移調楽器の記譜音と実音の取り違え | SDK | warning | 中 | | 要: 移調情報（音域自体は MS） |

## E. 構造 / 反復 / リハーサルマーク / 小節線

| # | 項目 | タグ | severity | 優先 | 状態 | 備考 |
|---|---|---|---|---|---|---|
| E1 | 終止線の確認 | NOW | info | – | ✅ | 既存 `final-barline` |
| E2 | コーダ/セーニョ整合 | NOW | error | – | ✅ | 既存 `coda-segno` |
| E3 | リピート開始/終了の対応 | SDK | warning | 高 | ✅ | `repeat-barline-match`。SDK `classifyBarlineKind` を start/end/both に細分し実装。snapshot は既存経路（新 helpers 公開後に発火） |
| E4 | リハーサルマークの順序（昇順・欠番） | NOW | info | 中 | ✅ | このバッチ `rehearsal-mark-order`（E5 重複も統合） |
| E5 | リハーサルマーク重複 | NOW | info | 低 | ✅ | E4 に統合 |
| E6 | セクション境界（二重線）前後のリハーサルマーク有無 | NOW | info | 低 | | |

## F. リズム / 連桁の浄書（拍の見せ方）

| # | 項目 | タグ | severity | 優先 | 備考 |
|---|---|---|---|---|---|
| F1 | 4/4 等で拍頭（特に 3 拍目）が休符のまとめ過ぎで隠れる | SDK | info | 高 | 要: 拍子。浄書の最重要ルールの一つ |
| F2 | 小節線をまたぐ音価（タイで書くべき長音） | SDK | warning | 中 | 要: 拍子 + タイ |
| F3 | シンコペーションの連桁が拍の見せ方に反する | SDK | info | 中 | 要: 拍子 + beam |
| F4 | 連符の不適切な記法 | SDK | info | 低 | 要: 連符情報 |
| F5 | stem 方向の不統一（同 voice 内、beamMode と矛盾） | NOW | info | 低 | stemDirection/beamMode で部分的に可 |

## G. スラー / フレージング / アーティキュレーション整合

| # | 項目 | タグ | severity | 優先 | 状態 | 備考 |
|---|---|---|---|---|---|---|
| G1 | 同リズム間のスラー/アーティキュレーション整合 | NOW | info | – | ✅ | 既存 `articulation-slur-consistency` |
| G2 | スラーとタイの混同（同度連結なのにスラー） | SDK | warning | 中 | | D6 と同根 |
| G3 | アーティキュレーションがタイ中間音に付く | SDK | info | 低 | | 要: タイ |

## H. 楽器別（非弦中心）

| # | 項目 | 楽器 | タグ | severity | 優先 | 備考 |
|---|---|---|---|---|---|---|
| H1 | 長い連続音にブレス記号が無い（管楽器の長フレーズ） | 管 | SDK | info | 中 | 要: 楽器族 + 連続音長。閾値は要相談 |
| H2 | ミュート指定後の `open` 戻し漏れ | 金管 | NOW | warning | 高 | ✅ C8 `mute-open` に統合 |
| H3 | 移調楽器で「in B♭」等の調表記漏れ | 移調 | SDK | info | 低 | 要: 移調情報 |
| H4 | ハープのペダル変更指示/グリッサンドのペダル整合 | ハープ | SDK | info | 低 | 要: 音高 + ペダル図。難度高 |
| H5 | ピアノ両手譜表の声部書き分け不整合 | 鍵盤 | NOW | info | 低 | staffIdx ペア + voice |
| H6 | 無音程楽器に有音程記譜 | 打楽器 | SDK | info | 低 | 要: 楽器（無音程フラグ） |
| H7 | 1 音節に複数音符でスラー（メリスマ）が無い | 声楽 | SDK | info | 低 | 要: 歌詞 |
| H8 | 歌詞のハイフネーション/メリスマ線の欠落 | 声楽 | SDK | info | 低 | 要: 歌詞 |

## I. 装飾 / 特殊奏法

| # | 項目 | タグ | severity | 優先 | 備考 |
|---|---|---|---|---|---|
| I1 | トレモロ表記とテンポの整合（過剰な beam 数） | SDK | info | 低 | 要: トレモロ情報 |
| I2 | グリッサンド線の始終点が同音 | SDK | info | 低 | 要: 音高 + グリッサンド |
| I3 | トリル/装飾音に臨時記号の指定漏れ | SDK | info | 低 | 要: 装飾音 + 音高 |

## J. 音高 / 臨時記号の綴り

| # | 項目 | タグ | severity | 優先 | 備考 |
|---|---|---|---|---|---|
| J1 | 不要な臨時記号（同小節で既に有効） | SDK | info | 中 | 要: 音高/tpc + 小節（拍子） |
| J2 | 親切記号（courtesy accidental）の欠落 | SDK | info | 低 | 要: 音高/tpc |
| J3 | ダブルシャープ/フラットなど不自然な綴り | SDK | info | 低 | 要: tpc |
| J4 | 異名同音の不統一（声部間） | SDK | info | 低 | 要: tpc |
| J5 | 音域逸脱 | MS | – | 対象外 | MuseScore が表示 |

---

## SDK 拡張計画（`SDK` 項目を解放するため）

データ供給経路は **SDK types/helpers → `packages/musescore-api` ブリッジ → `snapshot.ts` → LintEvent/meta**。
優先度順に段階導入（採否は次ステップで判断）:

1. **音高（最優先・波及大）**: `Note.pitch`/`Note.tpc` を SDK types で公開 → helpers に `getNotePitches(chord)` →
   `snapshot.ts` の chord 処理で `ev.pitches` 付与。解放: D6, G2, J1–J4, I2。
2. **拍子**: `TimeSig` を helper で取得 → `meta.timeSigByMeasure`。解放: F1, F2, F3, J1 の小節境界。
3. **楽器メタ**: `Part.instrumentId`/移調/MIDI program/有音程フラグを `meta.parts[]` に拡充。解放: H1, H3, H6, D7。
4. **タイ / グリッサンド**: 既存の `note.spannerForward` 経路で `meta.ties`/`meta.glissandos`。解放: D4, D5, D6, F2, G2, G3。
5. **連符・装飾・歌詞**: 後追い。解放: F4, I1, I3, H7, H8。
6. **リピート種別**: `enumRegistry` に `REPEAT_START`/`REPEAT_END` を追加（barlineType の正規化）。解放: E3。

> SDK の generated 型は手編集禁止（`config.json` 更新 → `pnpm generate:types`）。
> 公開済み C++ ヘッダに該当プロパティが無い場合は helper 側の手書き型で補う。
> types を触る場合は `pnpm changeset`（`.claude/rules/releasing.md`）。
