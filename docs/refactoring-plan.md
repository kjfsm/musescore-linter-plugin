# 全体コードレビュー結果とリファクタリング計画

## 実施状況（2026-08-03 時点）

短期（S1〜S17）と中期（M0〜M11）はブランチ `refactor/structural-cleanup` で実施済み。
実施中に判断を変えた点が 2 つある。

- **M2（MusicXML 側の契約未充足を埋める）は方針を変更して M3 に統合した。**
  global scope / subtype / EXPRESSION は MusicXML に相当する表現が無く、埋めようとすると
  テキストからの推測になる（S9 で避けたばかりの誤検出の温床）。追跡した結果、これらの差分は
  checker の挙動を変えていなかった一方、**checker 側の kind 集合の不揃い**が実際に取りこぼしを
  起こしていた（coda-segno が EXPRESSION を、rest-annotation が SYSTEM_TEXT を見ていなかった）。
  「どちらの表現でも同じ結果になる」形に checker を寄せるほうが正しいと判断した。
- **M11 は二分探索の 1 件のみ実施し、残りは足切りした。**
  S5 のベースラインで lint 全体が 23ms、個々の O(n^2) はいずれも 0〜1ms しか占めていない。
  支配的なコストは MusicXML のパース（268ms）側にある。速度を詰めるなら次はそちら。

計画と実装がずれている点（レビューで検出、記録のため残す）:

- **M0 は `KNOWN_DIFFS` 方式ではなく、ソースごとの独立プロファイル 2 本で実装した。**
  同一楽譜の IR を突き合わせる想定だったが、`.mscz` を Node で読めない以上 MuseScore 側は
  手書きモックからしか作れず、MusicXML 側の fixture とは別の楽譜になる。差分オブジェクトを
  作っても「モックと duet.musicxml の違い」を測るだけで意味を持たない。結果として
  M1 / M2 の検証欄にある「`KNOWN_DIFFS` からエントリが消えること」は実行していない。
- **S2 の検証欄と共通ゲートに残る `turbo run ... build:web` は成立しない。**
  `build:web` は turbo タスクではなく（`build` が `@musescore-linter/web#build` を含む）、
  グラフ検証ステップはまさにこれを「未定義タスク」として検出する側にある。
- **L4 の一部（`src/bundle-entry.ts` と `scripts/build.ts` の EXPORTS 二重管理の解消）を
  M5 の中で実施した。** M5 で QML から `isCheckerEnabled` を呼ぶ必要が生じ、二重管理の
  片方に足すだけでは露出しないため。この過程で `resolveCheckerOptions` が EXPORTS に
  無いまま QML から呼ばれていたことが判明した（下記）。
- **S15 / S16 の実機確認（MuseScore 4 実機・ブラウザ操作）は未実施。** 各コミットにも明記。

長期は L4 の上記 1 点を除き未着手。

---

## Context

MuseScore 4 プラグインとして始まったこのリポジトリに、後から Web 版・CLI・MusicXML 入力ソースが追加された。
その結果、**「LintIR を作る側」が 2 実装（MuseScore / MusicXML）、「結果を出す側」が 3 実装（QML / CLI / Web）**
という構造になり、それぞれの境界に重複と非対称が溜まっている。

レビューで確認できた歪みは 3 種類に分類できる。

1. **正しさの非対称** — 同じ楽譜でも入力ソースによって checker が動いたり動かなかったりする。
   MusicXML 経路で `opening-tempo`（severity=error・既定 ON）が誤報し、`cresc-text-resolution` は 1 件も検出しない。
   MuseScore 経路では `tempo-without-bpm` が原理的に発火しない。**これは実害のあるバグ**。
2. **一次情報源の分裂** — LintIR の構築、パート括弧の正規化、カテゴリのラベル/順序、
   checker の有効判定、severity 集計が 2〜4 箇所に複製されている。
   複数箇所がコメントで「もう片方と揃える」と相互参照しているが、**既に実際に乖離している**。
3. **検証装置の欠落** — CI が turbo を通らず、`packages/*/tests` の型エラーが検出されず、
   `apps/web` と `snapshot.ts`（451行）がカバレッジ計測外で、性能ベースラインが無い。
   つまり **1 と 2 を直す作業の正しさを検証する手段が今は無い**。

目指す状態は「LintIR という契約を 1 箇所で定義し、両ソースがそれを満たすことをテストで保証し、
3 つの UI が同じメタデータを読む」構造。この計画はそこへの経路を短期・中期・長期に分けたもの。

---

## フェーズの判定基準

サイズ／リスクの単一軸ではなく、次の 2 ゲートで短期・中期を分ける。

- **G1: 設計判断を含まないか** — 「LintIR がソース間で何を保証するか」「共有物をどのパッケージに置くか」の
  判断を伴う変更は短期に入れない。
- **G2: 後続で剥がされないか** — 中期タスクで書き換え・削除される見込みのコードを書くなら、
  それは短期タスクではなく中期タスクの一部。

| Phase    | 定義                                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **短期** | G1・G2 を両方通り、1 PR で完結し単独でロールバック可能。**加えて後続の検証装置になるもの（CI・型・カバレッジ・性能ベースライン）はサイズを問わずここに前倒しする**（ユーザー選択: 基盤先行） |
| **中期** | 「共有の一次情報源を 1 箇所作り、複製をそこへ寄せる」変更。主眼はデータ契約とメタデータの統一で、コード抽象の導入は最小限。公開 API 変更は `packages/core` の中に閉じる                      |
| **長期** | パッケージ境界とランタイム構造の変更。2 リリース以上にまたがる段階移行が必要                                                                                                                 |

### バグ修正をどこに置くか

**A1/A2 は短期、A3/A4/A5 は中期の先頭。** 根拠:

- A1（MusicXML の BPM 無しテンポ語が STAFF_TEXT になる）と A2（tempo の NaN ガード欠落）は単一関数に閉じ G1 を通る。
  かつ **中期の適合テスト（M0）より先に直さないと、誤った振る舞いを characterization test に焼き付けてしまう**。
- A3/A4/A5 は「MusicXML 経路が LintIR 契約の一部を満たしていない」という単一の根本原因の別の顔。
  1 件ずつ checker 側で回避すると、中期の共通化で全部剥がすことになる（G2 に抵触）。

---

## Phase 1（短期）— 17 PR

### 1-A. 安全網（最優先。他のすべてがこの上に乗る）

| ID     | 内容                                                | 対象                                                                            | 依存 |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------- | ---- |
| **S1** | typecheck の対象を `packages/*/tests/**` まで広げる | `tsconfig.json`, `package.json`(scripts.typecheck), `packages/*/tsconfig*.json` | —    |
| **S2** | CI を turbo 経由に統一する                          | `.github/workflows/ci.yml`, `package.json`(scripts.pipeline)                    | S1   |
| **S3** | turbo の inputs / outputs を実態に合わせる          | `turbo.json`                                                                    | S2   |
| **S4** | カバレッジ計測範囲を正す                            | `vitest.config.ts`                                                              | S1   |
| **S5** | 性能ベースラインと計測装置を敷く                    | 新規ベンチ + `fixtures/scores/Beethoven_Op.67_1_full/`                          | S4   |
| **S6** | oxlint に react / react-hooks / jsx-a11y を有効化   | `.oxlintrc.json`, `apps/web/src/**`                                             | S2   |
| **S7** | core / checkers の MuseScore 非依存を機械的に強制   | `.oxlintrc.json`（`no-restricted-imports` の overrides）                        | S6   |
| **S8** | score-lint.yml の空振りを直す                       | `.github/workflows/score-lint.yml`                                              | S3   |

**S1 の理由** — 現状 `pnpm typecheck` はルート tsconfig（`include: src/**, scripts/**`）+ web のみ。
`packages/*/tests/**` の型エラーが CI をすり抜けている。中期で `snapshot.ts` を `buildIR` に載せ替えると
テスト側の型が真っ先に壊れるが、今は気づけない。
**検証**: `packages/core/tests/linter.test.ts` に意図的な型エラーを一時的に入れ `pnpm typecheck` が落ちること。

**S2 の理由** — CI は `pnpm lint / knip / typecheck / test:coverage / build / build:web` を直に叩いており、
turbo の task graph が CI で一度も検証されていない。直近の「pipeline が未定義タスク build:web で落ちる」
（コミット `1d9c3fd`）はこれが根本原因。S3 以降で turbo.json を触るので先に検証経路を作る。
**検証**: `turbo run --dry=json` で graph をダンプし `build:web` が `@musescore-linter/web#build` に解決されること。

**S3 の理由** — `turbo.json:35-41` の `//#build` の inputs に `ScoreLinter.qml` / `qml/**` /
`package.json`（version 注入元）が無い。QML だけ編集して `turbo build` するとキャッシュ誤ヒットで
`dist/` が更新されず、`//#package` が古い QML で ZIP を作る。
`//#package` の outputs（`turbo.json:59`）もバージョン無しの `musescore-linter-plugin.zip`
（`release.yml` が参照）を取りこぼしている。
**検証**: `qml/SettingsPanel.qml` にコメントを 1 行足して `turbo run build --dry=json` がキャッシュミスになること。

**S4 の理由** — `vitest.config.ts:15` の `coverage.include` が `packages/*/src/**/*.ts` のみで、
**`apps/web` はテスト 30 本があるのにカバレッジ計測ゼロ**。codecov 80% ゲートの外にある。
`exclude` の `**/snapshot.ts`（451行）は理由コメントが「MuseScore ランタイム無しでは実行不可」だが、
`packages/source-musescore/tests/snapshot.test.ts`（329行）が既にモックで実行しており事実と違う。
`**/enumRegistry.ts` も純粋定数なので除外不要。閾値はこの PR では据え置き（実測値が出てから調整）。

**S5 の理由** — 中期の O(n²) 解消（M11）は**現状の実測値が無いと是非も効果も判断できない**。
`packages/core/tests/perf.test.ts` は Perf ユーティリティ自体のテストなので代替にならない。
`fixtures/scores/` に実楽譜があるので新規素材は不要。
既存の `getCheckerPerfReport()`（`packages/core/src/linter.ts:14`）を使い、checker 別内訳を出す。
**CI では閾値で落とさず job summary に数値を出すだけ**（runner のブレが大きい）。
**この PR は最適化を一切含まない。計測装置だけ。**

**S6 の理由** — 実効プラグインが `["unicorn","typescript","oxc"]` のみで、React アプリなのに
rules-of-hooks / exhaustive-deps / jsx-key が無検査。S16 で hooks を触る前に入れる。
`react-in-jsx-scope` が automatic runtime で大量に鳴るので `settings.react.runtime` の設定か
当該ルール off を添えること。指摘が多ければ `rules-of-hooks` を error、`exhaustive-deps` を warn から段階有効化。

**S7 の理由** — CLAUDE.md の最重要制約が人力チェックのみ。中期で両ソースを共通基盤に寄せるとき
SDK 型が core に漏れる事故が起きやすい。**turbo boundaries ではなく oxlint で行う**
（CI の実行経路に既に乗っておりコストがゼロ）。
**検証**: `packages/core/src/types.ts` に SDK 型の import を一時的に足して `pnpm lint` が落ちること。

**S8 の理由** — `SCORES_DIR: scores` だが `scores/` は存在せず、楽譜は `fixtures/scores/` にある。
`on.paths` も `scores/**` なので**ワークフローは常に空振り**している。
**ユーザー判断により `fixtures/scores/` はそのまま残し、`SCORES_DIR` をそこへ向ける**
（同一楽譜の `.mscz`/`.musicxml`/`.mxl` が対で揃っており、M0 の適合テストと S5 のベンチの一次素材になるため）。
`on.paths` に `packages/checkers/**` と `packages/core/**` も追加する（checker を変えたのに回帰チェックが走らない）。
**検証**: `workflow_dispatch` で手動実行して Beethoven 2 種が解析されること。この時点の検出件数を S9/S10 の before として記録。

### 1-B. バグ修正（振る舞いが変わる）

| ID      | 内容                                                   | 対象                                                                                                             | 依存 |
| ------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---- |
| **S9**  | MusicXML の BPM 無しテンポ語を TEMPO_TEXT にする（A1） | `packages/source-musicxml/src/builder.ts:589-601`                                                                | S8   |
| **S10** | tempo 値の NaN ガードを両側に入れる（A2）              | `packages/source-musescore/src/snapshot.ts:233`, `packages/checkers/src/tempoWithoutBpmChecker.ts:24`            | S9   |
| **S11** | `measureAtTick` を `ir.meta.measures` の二分探索にする | `packages/checkers/src/base/query.ts:4-11`                                                                       | S5   |
| **S12** | 小さな防御バグ 3 件                                    | `packages/cli/src/run.ts:44`, `apps/web/src/components/ResultTable.tsx:47,51`, `apps/web/src/lib/rules.ts:64-73` | S1   |
| **S13** | registry の重複 id で throw する                       | `packages/core/src/checkerRegistry.ts:8`                                                                         | S1   |

**S9** — `<words>Allegro</words>` に `<sound tempo>` も `<metronome>` も無い場合、
TEMPO_TEXT ではなく STAFF_TEXT として発行される。一方 MuseScore 経路は `isTempo(ann)`（要素型判定）だけで
TEMPO_TEXT にする（`snapshot.ts:209`）。結果、Sibelius/Finale 等が出した MusicXML で
`openingTempoChecker`（severity=error・既定 ON）が **CLI/Web の主経路で誤報**する。最も実害の大きい 1 件。
**検証**: 該当 fixture で kind が TEMPO_TEXT・`tempo` が null になること。S8 のワークフローで実楽譜の検出件数が減ること。

**S10** — SDK の `getTempoBpm` は `Math.round(el.tempo * 60)` を返すだけで `el.tempo` 未定義なら NaN。
`tempoWithoutBpmChecker.ts:24` は `null`/`undefined` しか弾かないので NaN は「BPM あり」と判定され、
**MuseScore 経路でこの checker が原理的に発火しない**。2 ファイルにまたがるが論点は
「tempo は有限数か null のみを取る」という不変条件 1 つなので 1 PR。

**S11** — **バグ修正と性能改善が同一の修正で片付く数少ないケース**。現状は `byTick` を引くので、
その tick にイベントが無いと 0 を返す（hairpin の endTick 等）。0 になった issue は `compareIssues`
（`packages/core/src/issue.ts:38`）で先頭に並ぶため、ユーザーには「小節 0 の謎の指摘が一番上に出る」と見える。
`ir.meta.measures` は startTick 昇順なので二分探索で O(log n)。
**これが `ir.meta.measures` を使う最初の実例になり、M11 の全件走査置換の手本になる。**

**S12** — いずれも 1〜3 行、回帰テストが書ける、他タスクと干渉しない。3 パッケージにまたがるが 1 PR にまとめる。

- `run.ts:44` の `Math.max(...checkers.map(c => c.id.length))` は空配列で `-Infinity` → `padEnd` が RangeError
  （`format.ts:75` は `Math.max(..., 0)` で防御済みで非対称）
- `ResultTable.tsx` が results を**ファイル名キー**で引き `key={file.name}` を使う
  → 別フォルダの同名ファイル 2 つで key 衝突と結果の取り違え
- `saveEnabledRules` だけ `allRuleIds()` を呼んでおらず `diffFromDefaults`（108-113）と非対称。
  初期化順が変われば全 override が消える潜在バグ

**S13** — 現状 `register` が重複 id を黙って捨てるため、id を打ち間違えた checker は
「登録したのに動かない」状態になり気づく手段がない。M9 で登録経路を触る前に失敗を可視化する。
**検証**: `registerAll()` が現状 31 件すべて通ること（通らなければ既に重複がある）。

### 1-C. 即効の削除・UI 改善

| ID      | 内容                                                      | 対象                                                                                                              | 依存   |
| ------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| **S14** | 未使用 derived 2 種を削除する                             | `packages/core/src/linter.ts:53-69`, `packages/core/src/types.ts`(IRDerived), `.claude/rules/checker-contract.md` | S5     |
| **S15** | `ScoreLinter.qml` の `parts()` が snapshotIR を直読みする | `ScoreLinter.qml:389-397`                                                                                         | S3     |
| **S16** | apps/web の lint 実行をレンダーから追い出す               | `apps/web/src/App.tsx:37-41`                                                                                      | S5, S6 |
| **S17** | 規約ファイルと README の構成図を現構成に合わせる          | `.claude/rules/checker-contract.md`, `README.md`                                                                  | S14    |

**S14** — `annotationIdsByTick` / `globalAnnotationIdsByTick` はリポジトリ全体で読み手ゼロ。
全 tick 走査 + クロージャ生成が純粋な無駄。**唯一の「参照」が `.claude/rules/checker-contract.md` の
LintIR 図**なので、コードと規約を同時に直す必要がある（放置すると将来の checker 作者が使ってしまう）。

**S15** — 現状 `snapshotIR.meta.parts` を直接読めばよいのに、スナップショットタブを開いたときだけ
生成される巨大 JSON 文字列を `JSON.parse` し直している。結果、タブを開くまでパート絞り込みが空、
開いた後はバインディング再評価のたびに数 MB のパースが UI スレッドで走る。`catch(e){}` の握り潰しも
CLAUDE.md の never-catch 規約違反なので、`snapshotIR` 未生成の分岐として書き直す。
**検証**: MuseScore 4 実機で、スナップショットタブを開かずにパート絞り込みが機能すること。

**S16** — `lintParsed` が `useMemo` 内＝**レンダー中に同期実行**。チェックボックス 1 個で全ファイル再 lint し、
その間 `busy` が立たないので進捗表示無しに UI がフリーズする。ユーザーの関心「動作速度」に最も直結。
**この PR では Web Worker を導入しない。** `useMemo` → `useEffect` + `useState` + `startTransition`
（または `handleFiles` と同じ `setTimeout(0)` の 1 フレーム譲り）に留める。Worker 化はスレッド境界の
設計判断を伴い G1 に抵触するので、S5 の実測を見て L2 で判断する。

**S17** — `.claude/rules/checker-contract.md` が **pre-monorepo のパス**を書いている
（`src/checkers/xxxChecker.js`, `src/checkers/index.js`, `test/runner.js`, `src/issue.js`, `linter.js`）。
**毎セッション自動注入される**ので、ズレた規約は複利で損をする。README の構成図が checker 31 件中
14 件しか列挙していないのも同時に直す。`/docs-audit` skill を回して検証。

---

## Phase 2（中期）— 12 PR

### 2-A. 適合テストと IR 構築の一本化

**M0. ソース間適合テスト（characterization suite）を敷く【Phase 2 の要】**

- **対象**: 新規 `packages/core/tests/conformance/` 相当。
  fixture は `packages/source-musicxml/tests/fixtures/duet.mscz` + `duet.musicxml`（既存の対）と
  `fixtures/scores/Beethoven_Op.67_1_cut/`（同一楽譜の 3 形式が揃っている）
- **なぜ今**: A4/A5・LintIR 構築の二重実装・partGroups の二重実装はすべて
  「同じ楽譜から作った 2 つの IR が違う」という 1 つの事象の別の顔。
  個別に直すのではなく**差分を一覧で可視化してから 1 項目ずつ緑にする**のが最短
- **依存**: S1, S4, S9, S10（**誤った振る舞いを記録しないため A1/A2 修正後が必須**）
- **比較するのはイベント個別の一致ではなく契約項目の分布**:
  ①`scope: "global"` の有無、②生成される `kind` の集合、③`subtype`/`subStyle` の充填率、
  ④`measure` の既定値、⑤`type` 導出の一致、⑥`partGroups` の正規化結果
- **初期コミットでは全差分を `KNOWN_DIFFS` として明示列挙した状態でグリーンにする**
  （`expect(diff).toEqual(KNOWN_DIFFS)`）。以降の M タスクがエントリを 1 つずつ削る
- **妥協点の明記**: MuseScore 側は `snapshot.test.ts` の既存モック機構で IR を作る（CI で MuseScore は動かせない）。
  モックの忠実度が上限になるので、「モックが実機と一致している保証」は
  S8 の score-lint ワークフロー（実機 MuseScore で .mscz → MusicXML 変換 → CLI 解析）が担う二段構えにする

**M1. LintIR 構築を `buildIR` に一本化する**

- **対象**: `packages/core/src/irBuilder.ts`, `packages/source-musescore/src/snapshot.ts:165-206`
- **問題**: `irBuilder.ts:81-158` の `buildIR`（MusicXML が使用）と `snapshot.ts` の
  `pushIndexedId`/`appendEvent`（自前実装）が二重実装で、**既にドリフト済み**:
  `measure` 既定 1 vs 0、`scope` 既定は staffIdx から導出 vs 常に `"staff"`、`type` 導出の有無
- **設計上の要点**: `buildIR(spec)` は一括 API だが `snapshot.ts` は**逐次生成**。
  core に `createIRBuilder()`（`append(event)` / `finish()`）を追加し `buildIR` はその薄いラッパにする。
  **これ以上の抽象化（Visitor / Strategy）は不要**
- **依存**: M0 / **検証**: `KNOWN_DIFFS` から measure・scope・type の 3 エントリが消えること。
  `snapshot.test.ts`（329行）全件グリーン。S5 のベンチで劣化なし

**M2. MusicXML 側の契約未充足を埋める（A4, A5）**

- **対象**: `packages/source-musicxml/src/builder.ts`（`staffIdxOf` / 540 付近、テキスト・ダイナミクスの発行）
- **問題**: `scope: "global"` が一切生成されず（builder.ts:540 が必ず staffOffset 以上を返す）、
  `openingTempo` / `firstNoteDynamics` / `crescTextResolution` / `hairpinTargetDynamic` の
  global フォールバック分岐がデッドコード。`subtype`/`subStyle` 未充填で
  `duplicateDynamics`/`simultaneousDynamics` が textNorm 比較に劣化。EXPRESSION / SYSTEM_TEXT kind も未生成
- **依存**: M1
- **注意**: **これは検出件数が増える変更**。changeset で minor を切り、
  CHANGELOG に「MusicXML 経路で新たに検出されるようになったルール」を列挙する。
  S8 のワークフローで before/after を記録し、増えた分が正当な検出かをサンプリング確認する

### 2-B. 共通化（一次情報源を 1 箇所作って寄せる）

| ID     | 内容                                                                | 対象                                                                                                                                                                                        | 依存   |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **M3** | テキスト系 kind の集合と global 注記走査を共通化（A3 の解決を含む） | `packages/checkers/src/base/predicates.ts:43-50`, `base/query.ts`, `tempoChangeResolutionChecker.ts`, `codaSegnoChecker.ts`, `restAnnotationChecker.ts`, `crescTextResolutionChecker.ts:39` | M2     |
| **M4** | partGroups の正規化を core へ共通化                                 | `packages/source-musescore/src/snapshot.ts:128-163`, `packages/source-musicxml/src/partGroups.ts:94-129` → `packages/core/src/`                                                             | M1     |
| **M5** | checker の有効判定を core に一本化                                  | `packages/core/src/linter.ts:147-150`, `packages/cli/src/args.ts:161-172`, `apps/web/src/lib/rules.ts:55-58`                                                                                | —      |
| **M6** | カテゴリのラベルと表示順を単一ソース化                              | `apps/web/src/lib/rules.ts:15-22`, `qml/SettingsPanel.qml:58-64`, `src/bundle-entry.ts` → `packages/core/src/`                                                                              | S3, M5 |
| **M7** | 音高スペリングを core に集約しラウンドトリップテストを敷く          | `packages/core/src/pitchSpelling.ts`, `packages/source-musicxml/src/pitch.ts:46-50`, テストを `packages/core/tests/` へ移動                                                                 | —      |

**M3** — 「テキスト系 kind の集合」が 4 箇所に別定義で要素数が 6/4/3/3 とバラバラ。
global scope の走査も 4 checker で 3 通り（`byStaff["-1"]` 文字列キー線形走査 ×2、`byStaffAndKind[-1]` 数値キー ×2）。
**A3（cresc. が Web/CLI で 1 件も検出されない）の正しい修正先がここ**。
`base/query.ts` に `globalEventsOfKind(ir, kind)` を追加する。
**M2 の後でなければならない** — 先に checker 側を直すと MusicXML が正しい kind を出すようになった時点で回避策を剥がすことになる。
**検証**: `grep -rn 'byStaff\["-1"\]' packages/checkers` が 0 件になること。

**M4** — 「staffCount<2 除外・`symbol:start:count` で dedup・startStaffIdx昇順/staffCount降順ソート」が完全二重実装。
両ファイルのコメントが相互参照して「MusicXML 経路と揃える」「MuseScore 経路と揃える」と書いているだけ。
**コメントで整合性を維持する設計は必ず壊れる。** 両ソースが使うので置き場は `checkers/base` ではなく `core`。

**M5** — 三重化しており、web 側にはコメントで「core の linter と同じ判定にそろえる」と書いてある（M4 と同じアンチパターン）。
core に `isCheckerEnabled(checker, enabledRules)` を export して 3 箇所が呼ぶ。

**M6** — **既に乖離している**: 順序が articulation 先頭（web）vs tempo 先頭（QML）、
ラベルが「強弱」（web）vs「ダイナミクス」（QML）。
さらに QML は `categoryOrder` 配列駆動なので**配列に未登録のカテゴリの checker は設定タブに出ない**潜在バグ付き。
`ScoreLinter.qml:6` が `import "dist/bundle.js" as Bundle` でバンドルを読むので、
`src/bundle-entry.ts` に `getCategories()` を追加すれば QML から呼べる。
QML 側は配列駆動をやめ未知カテゴリを末尾に回すフォールバックにする。

**M7** — `tpc → step/alter`（core）と `step/alter → tpc`（source-musicxml）が別パッケージに分かれ逆関数の保証が無い。
テストが checkers パッケージに越境配置されているのも同時に解消。全 tpc 範囲の property test でラウンドトリップの恒等性を検証。

### 2-C. テスト基盤とレジストリ

| ID      | 内容                                                       | 対象                                                                                                                                                                                                    | 依存       |
| ------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **M8**  | vitest を projects 構成に移行し alias 三重複を解消         | `vitest.config.ts`, `packages/*/vitest.config.ts`(5本), `apps/web/`, `scripts/build.ts:33-40`, `scripts/build-cli.ts:31-35`                                                                             | S1, S2, S4 |
| **M9**  | checker 登録の同期点を 1 箇所にする                        | `packages/checkers/src/index.ts`                                                                                                                                                                        | S13        |
| **M10** | `TextPairCheckerConfig` の所在を正し severity 不整合を解消 | `packages/core/src/types.ts:230-242`, `packages/checkers/src/base/textPairChecker.ts:15-17`, `slurOnRestChecker.ts`, `hairpinOnRestChecker.ts`, `restAnnotationChecker.ts`, `beatCrossingTieChecker.ts` | M9         |

**M8** — `turbo run test` で全テストが 2 回走る（`pnpm-workspace.yaml` がルート `.` をメンバーにしており、
ルートの vitest が packages を全部含むため）。per-package config が 5 本ほぼ同内容。
`apps/web` は vitest 設定が無く `vite.config.ts` を拾って react plugin を毎回ロードしている。
alias の三重複も同じ PR で扱う — **各 package.json が `"main": "src/index.ts"` を持つので alias 自体が不要な可能性が高い。
まず alias を消して動くか検証し、動くなら 3 箇所とも削除**。
**設定の作り直しなので Phase 2 の最後に置く**（M0〜M7 が旧構成で完了してから）。
**検証**: `turbo run test` の総実行時間が短縮すること。alias 削除後に `pnpm build` / `pnpm build:cli` が
同一の出力を出すこと（バンドルの byte 比較）。

**M9** — 契約書は「唯一の同期点」と書いているが、実際は import(3-33) / register(37-67) / export(70-101) の
3 箇所を手で揃える必要がある。**自動生成スクリプトは導入しない**（ビルドステップが増え grep 可能性が下がる）。
import は残し `const ALL_CHECKERS = [...]` の配列 1 本から `registerAll()` と re-export を導出する最小変更。

**M10** — `TextPairCheckerConfig` は core 内で未使用なのに core にあり、実装側が
「core/types.ts を直接変更できない」ため `TextPairCheckerConfigWithOverrides` として拡張し直している。
**型の所在が誤っているせいで CLAUDE.md の制約が迂回されている**、規約とコードの不整合。
同時に severity の不整合を整理: `slurOnRest`(warning) vs `hairpinOnRest`(info) が同じヘルパを使う対称 checker、
`restAnnotation`/`beatCrossingTie` は checker.severity と発行 issue の severity が異なり UI 表示がズレる。
**判断が必要**: コミット履歴（`fb1bf91` "ヘアピンの開始端点が休符上にあるケースも info に緩和"）を見ると
hairpin 側は意図的に info に下げられているので、**「対称にする」ではなく「非対称である理由を型かコメントで明示する」が正解の可能性**。
実装者が履歴を確認して判断する。severity 変更はユーザーに見えるので **changeset 必須**。

### 2-D. 性能（S5 の実測に基づく）

**M11. O(n²) の解消**

- **対象**: `hairpinTargetDynamicChecker.ts:15-19`(H×D), `crescTextResolutionChecker.ts:64`(D²),
  `tempoChangeResolutionChecker.ts:60-72`(T²), `duplicateDynamicsChecker.ts:41,47-49`(P×H + D×H),
  `base/query.ts:62-71`(`slurCoversTick`/`tieCoversTick`), `packages/core/src/linter.ts`(chord 全件走査)
- **S5 の結果を見ずにこの PR を始めない。** 想定される優先順位:
  1. `slurCoversTick`/`tieCoversTick` — 最重量 checker（slurTieArticulationConsistency）の内側から
     chord ごとに 2 回呼ばれ、startTick 昇順ソート済み配列（`types.ts:128` に明記）に対して線形 `some` → **二分探索**
  2. chord 全件走査 6 回のうち後ろ 3 つ（`courtesyAccidental`、`slurTie` の measure 集合作り、
     `tempoChangeResolution` の `lastMusicMeasure`）を `ir.meta.measures` で代替（S11 が手本）
  3. 注記系の O(n²) 4 件
- **足切り**: ①②で目標に届いたら③はやらない。注記の件数は実楽譜でも数百オーダーで O(n²) が実測に出ない可能性が高い
- **依存**: S5, S11, M0
- **検証**: S5 のベンチで checker 別内訳の改善を数値で示す。`fixtures/scores/` の 2 楽譜に対する
  検出結果が完全一致すること（issue の JSON を before/after で diff）

---

## Phase 3（長期）— 4 テーマ（すべて実施）

**L1. レポート／プレゼンテーション層の分離**

issue の整形が CLI（`packages/cli/src/format.ts`）/ QML（`qml/IssuesPanel.qml:51-88` の text/markdown/csv）/
Web（`apps/web/src/lib/rows.ts`）の 3 系統に分裂し、`countBySeverity` は
`format.ts:56` / `IssuesPanel.qml:24` / `ScoreLinter.qml:69-83` の三重実装。
さらに `apps/web/package.json:17` が `@musescore-linter/cli` に依存している
（`FileResult` 型 + `stripPartPrefix`/`countBySeverity` の 2 関数のため）
— **ブラウザアプリ → CLI パッケージという依存方向の誤り**。

共有の `@musescore-linter/report` パッケージ（純関数のみ）を新設し 4 リリースに分けて段階移行:
①`countBySeverity` + `FileResult` 型の移設 → ②CLI → ③Web → ④QML。
QML 側は ES2017 バンドル制約があり CSV/Markdown は QML にしか実装が無いので同時切り替えは不可。
**①は Phase 2 の M5/M6 と同じ「core にメタ情報を集める」方向なので Phase 2 末尾に前倒し可**。
それだけで依存方向の誤りは解消する。

**L2. apps/web の Web Worker 化**

S16（レンダーからの追い出し）の後、S5 の実測を見て判断する。
IR をどう渡すか（構造化クローンのコスト vs Worker 側で再パース）、checker registry を Worker 内でどう初期化するか、
`ruleOptions` の受け渡しをどうするかの設計判断が要る。
**やらない判断の基準を先に決める: S5 の実測で Beethoven full 版の `runAllCheckers` が 50ms を下回るなら実施しない。**
Worker は CSP・バンドル分割・テストの複雑さを恒久的に増やすので、実測なしで入れる価値はない。

**L3. LintIR 契約のコード化**

M0 の `KNOWN_DIFFS` が空になった後、契約をテストではなく型で固定する。
`ensureDerived` を public API から外す — 現状は呼び忘れると checker が `?? []` で握り潰して
**エラーでなく「違反 0 件」**になる失敗モードが外に開いている。
`LintIR` を「derived を必ず持つ型」と「持たない型」に分ける。
`core/src/index.ts` の未使用 export（`getById` / `isPerfEnabled` / `compareIssues` /
型 `IRDerived` / `IRIndex` / `IssueFields` / `OptionParseResult`）の整理と、
`TieInfo` だけ export され `HairpinInfo`/`SlurInfo` が非公開という非対称の解消も同時に。

**やり方の注意**: `ensureDerived` を lazy getter や Proxy で隠すのは**やらない**。
QML の ES2017 バンドル制約と、`_eventsCount` によるキャッシュ判定の可読性を壊す。
**`runAllCheckers` が必ず呼ぶ現状のまま、テストから直接 checker を呼ぶための公式ヘルパ
`withDerived(ir)` を提供して `ensureDerived` の直接 export を落とす**、が最小で十分な解。

**L4. QML ロジックの TS 側への移設**

`ScoreLinter.qml`（727行）のうち約 450 行が JS ロジックで、vitest から一切テストできない:

- スナップショット JSON のチャンク生成 + 手組み JSON 連結（322-334。`JSON.stringify` の結果を文字列連結し、
  インデント整形のため `split("\n").join("\n  ")` までしている）
- 設定 JSON のマージ（125-165 の `loadEnabledRules` / `setRuleEnabled` / `loadRuleOptions` / `setRuleOption`）
- 更新確認の HTTP + パース（403-448）

`src/bundle-entry.ts` 経由でバンドル側へ寄せてテスト可能にする。
L1（レポート層）と重なる部分があるので **L1 の④（QML の整形移設）と同一 PR 群として進める**。
`src/bundle-entry.ts` の export 一覧と `scripts/build.ts:11-20` の `EXPORTS` 配列という
**2 箇所の手動同期点**もこのとき解消する（片方だけ足すと QML から `undefined` になり型エラーにもならない）。

---

## 依存順序

```
Phase 1                              Phase 2                      Phase 3
──────────────────────────────────────────────────────────────────────────────
S1 typecheck ─┬→ S2 CI turbo化 ─┬→ S3 turbo inputs ─┐
              │                  │                    │
              ├→ S4 coverage ────┼→ S5 perf ベース ───┼──────────────┐
              │                  │                    │              │
              ├→ S12 小バグ3件   ├→ S6 oxlint react ─┼→ S7 境界強制  │
              └→ S13 registry    │                    │              │
                                 └→ S8 score-lint 復活│              │
                                          │           │              │
                            ┌─────────────┘           │              │
                            ↓                         │              ↓
                      S9 A1 誤報 → S10 A2 NaN         │      S11 measureAtTick
                            │                         │      S14 derived 削除
                            ↓                         │      S15 QML parts
                      ┏━━━━━━━━━━━┓                   │      S16 web 非同期
                      ┃  M0 適合  ┃                   │      S17 規約更新
                      ┃  テスト   ┃                   │
                      ┗━━━━━━━━━━━┛                   │
              ┌─────────────┼─────────────┐           │
              ↓             ↓             ↓           │
        M1 buildIR      M4 partGroups  M5 有効判定    │
        一本化          共通化         M7 pitch       │
              ↓             │             ↓           │
        M2 契約充填         │          M6 カテゴリ    │
        (A4/A5)             │          統一(要S3)     │
              ↓             │             ↓           │
        M3 kind共通化       │          M9 登録同期点  │
        (A3)                │             ↓           │
              └──────┬──────┴──────  M10 型所在/severity
                     ↓                                │
              M11 O(n²)解消 ←──────────────────────────┘
                     ↓
              M8 vitest projects化（Phase 2 の最後）
                     ↓
              L1 レポート層分離 ─┬→ L4 QML ロジック移設（L1④と同一PR群）
              L2 Worker化（要判定基準）
              L3 IR契約のコード化
```

### 短期でやると中期が楽になるもの

| 短期   | 楽になる中期       | 理由                                                                   |
| ------ | ------------------ | ---------------------------------------------------------------------- |
| S1     | M1, M8             | `snapshot.ts` 書き換えでテスト側の型が真っ先に壊れる。今は検出できない |
| S4     | M1                 | `snapshot.ts` 451 行が計測外のまま大改造するのは無防備                 |
| S5     | **M11 の前提条件** | 実測なしに最適化の是非も効果も判断できない                             |
| S3     | M6                 | QML を触る PR でキャッシュ誤ヒットを踏まない                           |
| S8     | M2                 | 検出件数が増える変更の妥当性を実楽譜で検証できる                       |
| S9/S10 | M0                 | **誤った振る舞いを characterization test に焼き付けない**              |
| S13    | M9                 | 登録経路を書き換える前に失敗が可視化される                             |
| S11    | M11                | `ir.meta.measures` を使う最初の実例。以降の全件走査置換の手本          |

### 中期を先にやらないと短期が二重になるもの（短期でやってはいけない）

| やってはいけないこと                                | 正しい置き場所 | 理由                                                                           |
| --------------------------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `crescTextResolutionChecker` に STAFF_TEXT を足す   | M3             | kind 集合を共通化した後でないと 5 箇所目の重複定義になる                       |
| MusicXML に global scope を足す                     | M2             | M1 で共通ビルダに載せてからのほうが差分が小さい                                |
| web か QML の片方だけカテゴリラベルを直す           | M6             | 一次情報源を作らずに揃えても次の checker 追加でまた乖離する（M4 に前例がある） |
| `countBySeverity` を 3 箇所のうち 1〜2 箇所だけ直す | L1①            | 共有パッケージを作る前に部分統一すると移設時に全部書き直す                     |
| `scripts/build.ts` の alias だけ直す                | M8             | 「alias 自体が不要」の可能性が高く 3 箇所同時に消すのが正解                    |
| `partGroups` の片側だけ直す                         | M4             | 相互参照コメントによる整合性維持は既に破綻している                             |

---

## やらない判断

| 提案                                                  | 判断                         | 理由                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/src/version.ts` を別パッケージへ移す            | **やらない**                 | 47 行、テスト済み、動いている。パッケージを 1 つ増やす恒久コスト（package.json / tsconfig / vitest / turbo の設定 4 本）が概念的な純度に見合わない                                                                                                                                  |
| `barlineType`/`beamMode`/`stemDirection` を型から削除 | **単独タスクにしない**       | `stemDirection` は将来の checker（符尾方向の一貫性）が使う可能性がある。L3 の中で `@deprecated` を付け **QML スナップショットの JSON 出力から除外**するに留め、JSON 化コスト削減の実利だけ取る                                                                                      |
| checker 登録の自動生成スクリプト導入                  | **やらない**                 | ビルドステップが増え `grep checkerId` でヒットしなくなり、AI エージェントを含む読み手のナビゲーション性が下がる。M9 の「配列 1 本」で十分                                                                                                                                           |
| `fixtures/scores/` の削除 / LFS 移行                  | **やらない**（ユーザー判断） | M0 の適合テストと S5 のベンチの一次素材。削除対象ではなく活用対象。S8 で参照経路を作るのが正解                                                                                                                                                                                      |
| `packages/musescore-api` の整理                       | **後回し（Phase 3 で判断）** | 18 行、`export *` は利用者ゼロ、SDK 型を devDependencies に置いているのも誤り。ただし影響が小さく L1 のパッケージ境界整理と一緒に判断すればよい                                                                                                                                     |
| `core/src/index.ts` 未使用 export の削除              | **単独タスクにしない**       | knip が CI で走っているのに検出されていないので実体は knip.json の設定の話。L3 で export 面を整理するときに一括で                                                                                                                                                                   |
| IR ソースを Strategy インターフェースに抽象化         | **やらない（過剰抽象）**     | ソースは 2 つしかなく、片方は MuseScore ランタイム内でしか動かないので実行時差し替えの意味がない。**共有すべきはコード抽象ではなくデータ契約とテスト**であり、それが M0 + M1。3 つ目のソースが現実に必要になるまで純粋なコスト                                                      |
| `ensureDerived` を lazy getter / Proxy で隠す         | **やらない**                 | QML 向けバンドルは target es2017。Proxy の挙動と `_eventsCount` によるキャッシュ判定の可読性を壊す                                                                                                                                                                                  |
| branches 閾値 60% → 85% への引き上げ                  | **後回し**                   | S4 で計測範囲が変わると実測値が動く。閾値を先に上げると無意味なテストを量産させる圧力になる                                                                                                                                                                                         |
| テスト薄い箇所の網羅的補完                            | **部分的に実施**             | `pitchSpelling` の越境配置は M7、`checkerRegistry` の重複 id 分岐は S13、`irBuilder` の専用テストは M1 で、それぞれ該当タスクの検証手段として自然に入る。`logger.ts` のテストゼロと `first-note-dynamics` の負例不足は単独では ROI が低いので、次に該当ファイルを触るときのついでに |

---

## 検証

### 各 PR 共通のゲート

```bash
pnpm lint            # oxlint + oxfmt --check
pnpm knip            # 未使用コード検出
pnpm typecheck       # S1 適用後は packages/*/tests も含む
pnpm test:coverage
turbo run typecheck test build build:cli build:web package   # S2 適用後
```

### フェーズ固有の検証

**S1〜S8（安全網）** — 各タスク表の「検証」欄のとおり、
「意図的に壊して落ちることを確認してから戻す」方式で安全網そのものが機能することを確かめる。

**S9〜S13（バグ修正）** — 単体テストに加え、S8 の score-lint ワークフローを
`workflow_dispatch` で回して `fixtures/scores/` の 2 楽譜に対する検出件数を before/after で記録する。

**S15 / S16（UI）** — 実機確認が必要:

- S15: MuseScore 4 に ZIP をインストールし、スナップショットタブを開かずにパート絞り込みが機能すること。
  大きい楽譜（Beethoven full）でタブ切り替えが引っかからないこと
- S16: `pnpm dev:web` で Beethoven full を読み込み、チェックボックスを連打して
  「解析中…」が出て操作がブロックされないこと。`pnpm preview:web` で CSP 下でも同じ挙動になること

**M0〜M2（適合）** — `KNOWN_DIFFS` の残エントリ数が単調減少すること。
M2 は検出件数が増えるので、増分をサンプリングして正当な検出であることを目視確認し changeset に記録。

**M11（性能）** — S5 のベンチを before/after で実行し checker 別内訳の改善を数値で示す。
併せて `fixtures/scores/` の 2 楽譜に対する issue の JSON を diff して**完全一致**すること
（性能改善が振る舞いを変えていないことの保証）。

**M8（テスト基盤）** — `turbo run test` の総実行時間が短縮すること。
alias 削除後に `pnpm build` / `pnpm build:cli` の出力バンドルを byte 比較して同一であること。

### リリース時

- 振る舞いが変わる PR（S9, S10, S11, M2, M10）は **changeset 必須**
- M2 は minor。CHANGELOG に「MusicXML 経路で新たに検出されるようになったルール」を列挙
- `main` への直 push はしない。必ずブランチ + PR
