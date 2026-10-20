# ロードマップ — MuseScore Plugin SDK & Linter

> **ステータス:** ドラフト（2026-06-03 起票・生きたドキュメント）
> **スコープ:** 本ロードマップは 2 つのリポジトリ
> [`musescore-plugin-sdk`](https://github.com/kjfsm/musescore-plugin-sdk)（本リポジトリ）と
> [`musescore-linter-plugin`](https://github.com/kjfsm/musescore-linter-plugin) を、
> **1 つのスタックとして扱うプログラムロードマップ**です。

---

## 0. 背景と戦略判断

両リポジトリは独立した 2 プロダクトではなく、**1 本のスタック**を成している。

- **SDK（土台 / npm 公開）** … MuseScore 4 プラグインを TypeScript で書くための型・ヘルパ・型ジェネレータ。
- **linter（実利用者 / ZIP 配布）** … その SDK を消費する、弦楽五重奏向けの楽譜 Lint プラグイン。

方針決定にあたり、以下 3 点を確定した。この 3 つは 1 本の筋で繋がっている。

| 論点 | 決定 |
|---|---|
| **優先テーマ** | **基盤（SDK）の安定化** |
| **製品スコープ（linter）** | **弦楽四重奏・オーケストラへ拡大** |
| **SDK の位置づけ** | **公開 SDK として外部の作者も対象** |

> **通底する筋:** 「SDK を“公開された土台”として正す」→ だから **いま最優先は基盤の安定化** →
> そして linter を **オーケストラへ広げるほど土台（楽器・移調・要素網羅）が試される**ので、
> **先に SDK を固めるのは理にかなう**。
> つまり **オーケストラ対応 = SDK の要件を定義する「北極星」**、当面の手は **公開 1.0 に耐える土台づくり**。

---

## 1. 全体像（スタック）

```
  ┌─────────────────────────────────────────────┐
  │  musescore-plugin-sdk  (土台 / npm 公開)       │
  │   types(1.x) ─ helpers(2.x)                    │
  │   types-generator → MuseScore v4.7.3 を固定    │
  └───────────────▲─────────────────────────────┘
                  │ 依存 (helpers ^1.0.x / types ^0.1.x)
  ┌───────────────┴─────────────────────────────┐
  │  musescore-linter-plugin  (実利用者 / ZIP配布) │
  │   core(LintIR) ─ checkers(15個) ─ musescore-api│
  │                                   ▲           │
  │            SDKの型穴をここで継ぎ足している       │
  └─────────────────────────────────────────────┘
```

---

## 2. 現状サマリ

| | 強み | 弱み・リスク |
|---|---|---|
| **SDK** | helpers 12 モジュールが充実＆単体テスト完備 / 生成型の決定性＋ドリフト CI / provenance 付き npm 公開 / ホスト型 `MuseScore` 生成＋`definePlugin` で実行時 enum を型安全に扱える | types `1.x`・MuseScore **v4.7.3 固定**（最新に追従）/ ジェネレータは正規表現で `fetch.ts` 無テスト（`emit`/`parse`/`map-types` はテストあり）/ 生成型に無い実行時プロパティは `plainText` のみ（apiv1 に無く生成不能・M0 診断で確定。`color`/`text`/`duration`/`annotations` は既出） |
| **linter** | LintIR による疎結合設計 / index＋derived で高速 / 15 checker 全てに単体テスト / 設定 UI 自動生成 | **README が実態と乖離**（11 記載 vs 実 15 / 構成図が旧 `src/*.js` のまま）/ `snapshot.ts`（実機境界）に結合テストが無い / `meta.hairpins` を取得済みなのに未活用 |

> 上流バージョン: MuseScore は現在 **4.7.3**（2026-06）まで配布中。SDK は **v4.7.3** を pin している（types `1.x` = 4.7 系列）。M1 の「MuseScore 4.7 対応」は完了。さらにホスト型 `MuseScore` の生成と、実行時 enum を型安全に渡す `definePlugin` 方式を導入した。

---

## 3. 核心インサイト（なぜこの優先順位か）

1. **消費者の“回避コード”は既に stale。** linter の `packages/musescore-api` と例の `color` キャストは
   SDK に穴があった頃の名残りで、**v4.6.0 時点で `color`/`text`/`duration`/`Segment.annotations` は既に生成型に存在**する
   （後述「付録: M0 型穴診断」）。真に欠けるのは `plainText` のみ（apiv1 に無く生成不能）。問題は穴ではなく
   **「穴が塞がったことを消費者へ伝えるフィードバックが無く、不要な回避コードが債務として残る」**点。
   **→ ループを正式化し（linter を SDK の統合テストに）、stale を早期検知して撤去する。**
2. **開発インフラは成熟、製品方針は空白。** 直近は依存更新と `.claude/` 整備が中心で、issue ゼロ・README 放置が示す通り
   **「何を作るか」が未定**。ボトルネックは能力ではなく方向性 — だから本ロードマップを置く。
3. **テストの盲点は“一番危険な境界”に集中。** 純粋ロジックは厚いが、MuseScore に触れる境界
   （ジェネレータの実ヘッダ解析 / linter の `snapshot.ts`）が最も薄い。`plainText`（apiv1 に無い実行時 DOM 値）の
   ような例は「生成型 ≠ 実機が実際に公開する API」のズレを示し、実機ダンプとの突合（M2/M3 のゴールデンテスト）
   でしか検出できない。
4. **バージョン乖離は“時計が動いている負債”。** MuseScore 4.7 は既に配布中で、linter はエンドユーザーの
   MuseScore 上で動く。4.7 で apiv1 が変わっていれば **テストが緑のまま誤検出**しうる。
5. **types の pre-1.0 は“選択”。** 公開 SDK として外部作者を呼び込む決定をした以上、
   **1.0＋安定方針＋サポートするバージョン群の明文化**が必要になる。

---

## 4. マイルストーン

| | マイルストーン | 対象 | 主タスク | 完了条件 (DoD) |
|---|---|---|---|---|
| **M0** | 整地（即着手・低リスク） | 両 | ① linter README を実態同期（未記載 4 checker＝`sul-tasto-ord`/`sul-pont-ord`/`con-legno-arco`/`coda-segno` を追記、構成図を monorepo へ／`/docs-audit` 活用）<br>② 本プランを **GitHub milestone＋issue 化**（“issue ゼロ”解消）<br>③ **SDK 型穴の診断**：`color`/`text`/`plainText`/`duration`/`Segment.annotations` が *どのヘッダ・どの宣言形*（`Q_PROPERTY` / `API_PROPERTY` / `Q_INVOKABLE` / 基底クラス）で来るかを特定 | README が実態一致 ／ 両リポに backlog ／ 型穴の原因が表で判明 |
| **M1** | SDK 基盤の信頼性（最優先） | SDK | ① **stale 回避コードの撤去と `plainText` の判断**（診断結論: `color`/`text`/`duration`/`annotations` は v4.6.0 で既出。例の `color` キャスト除去・linter の `musescore-api` 縮小・`plainText` は手書き augmentation か依存を断つかを決定）<br>② **MuseScore 4.7 対応**（`ref` 更新→4.6 との差分レビュー→drift CI 緑、apiv1 が破壊的変更か検証）<br>③ **ジェネレータのテスト拡充**（`emit.ts` の統合/継承/`Omit`、`map-types` の Qt・テンプレ、`fetch` のキャッシュ） | stale 回避コード撤去・`plainText` 方針確定 ／ types が 4.7 生成 ／ `emit`・`fetch` までテスト被覆 |
| **M2** | public 1.0 への到達 | SDK | ① **types を 1.0**（公開サーフェス確定＋安定方針／サポートする MuseScore バージョン群を明文化）<br>② **外部作者向けドキュメント**（getting-started・helpers API 一覧・examples 導線）<br>③（任意）**ゴールデン・プラグイン**で apiv1 実機ダンプ↔生成型の突合手順 | types@1.0 公開 ／ 安定・サポート方針が文書化 ／ 外部作者が examples から開始できる |
| **M3** | 信頼性（実機/結合） | 両 | ① linter `snapshot.ts` の結合テスト（代表 `.mscz`）<br>② examples のスモーク手順（4.6/4.7）<br>③ **linter を SDK の統合テストとして CI 連携** | 最も壊れやすい境界に回帰テスト ／ 版更新で静かに壊れない |
| **M4** | linter オーケストラ拡大（北極星） | linter→SDK | ① 固定 5 譜表前提の解消（part-bucket / `textPairChecker` を多パート・多譜表へ一般化）<br>② **移調楽器対応**（既出の `concertKey`/`concertClefType`/`transposingClefType` を活用）<br>③ 楽器ファミリ別ルール（管：ブレス／金管：ミュート＝`con sord` 拡張／打・ハープ 等）＋ 取得済み `meta.hairpins` の活用 | オケ譜で誤検出なく動作 ／ 露見した SDK 不足は M1 のループへ還流 |

### 依存関係

```
M0 ──> M1 ──> M2
        │
        ├──> M3   (M1 と並行可)
        └──> M4   (M1 の移調・Part型・4.7 に依存)
```

### 要検証・未決（着手前に潰す）

- **4.7 が apiv1 を破壊的に変えたか** … M1 冒頭で確認し、結果で支援タスクを分岐。
- ~~各型穴の正確な宣言元~~ … **M0 診断で解決**（下記付録）。`color`/`text`/`duration`/`annotations` は v4.6.0 で既出、`plainText` のみ apiv1 に無く生成不能。
- ~~types 1.0 が支える MuseScore バージョン群~~ … **決定済み**：型の major ⇔ MuseScore の minor（`1.x`=4.7 を 1.0 の起点、`0.1.x`=4.6 はレガシー）。旧系列は `release/4.x` ＋ dist-tag で維持。詳細は `.claude/rules/releasing.md`。

---

## 5. 補足: issue バックログについて

本ロードマップ起票時点で、両リポジトリの GitHub issue は **0 件**（open/closed とも）だった。
プランニングが口頭・コード内回避コードに散在している状態であり、**M0 でこのロードマップを
milestone＋issue として起票する**こと自体が最初の一歩になる。

---

## 付録: M0 型穴診断の結論（2026-06-03）

実際の MuseScore v4.6.0 ヘッダ（commit `7829779…`）を取得し、生成物 `plugin-api.ts` と突合した結果:

| プロパティ | 宣言クラス / 形 | v4.6.0 生成型 | 結論 |
|---|---|---|---|
| `color` | `EngravingItem` `API_PROPERTY_T(QColor, color, COLOR)` | あり（`:134/626`、`color: QColor` = string） | **既出**。例の `Colorable` キャストは不要 |
| `text` | `EngravingItem` `API_PROPERTY(text, TEXT)` | あり（`:339`、`text: string`） | **既出** |
| `duration` | `DurationElement` `Q_PROPERTY(FractionWrapper* duration …)` | あり（`:472`、`FractionWrapper \| null`） | **既出**（4.6 で型化。pre-4.6 の `unknown` が回避コードの名残り） |
| `Segment.annotations` | `Segment` `Q_PROPERTY(QQmlListProperty<EngravingItem> …)` | あり（`:530`、`EngravingItem[]`） | **既出**（apiv1 にテキスト派生クラスが無く要素型は `EngravingItem`） |
| `plainText` | apiv1 に**存在しない**（DOM only の `TextBase::plainText()`） | なし | **生成不能**。必要なら手書き augmentation、不要なら依存を断つ |

**含意:** SDK 側に塞ぐべき「穴」は（`plainText` を除き）無い。やるべきは消費者側の **stale 回避コードの撤去**と、
再発を防ぐ**フィードバックループ**（linter を SDK の統合テストにする）。`plainText` の例は、実機ダンプとの
突合（ゴールデンテスト）の必要性を裏づける。

## 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-06-03 | 初版ドラフト起票（3 つの戦略判断と M0–M4 を確定） |
| 2026-06-03 | M0 型穴診断を反映：4/5 は v4.6.0 で既出と判明。insight #1 と M1 を「stale 撤去＋`plainText` 判断」に修正し、付録を追加 |
| 2026-06-03 | 採番方針を決定（型の major ⇔ MuseScore minor、4.7=`1.0.0` 起点・4.6=`0.1.x`）。`.claude/rules/releasing.md` を追加 |
| 2026-06-22 | MuseScore v4.7.3 へ追従。ホスト型 `MuseScore` を `qmlpluginapi.h` から生成し、`definePlugin` でホスト 1 個渡し＋実行時 enum＋バージョン照合に移行（M1 の 4.7 対応・型穴フィードバックの一部を前進） |
