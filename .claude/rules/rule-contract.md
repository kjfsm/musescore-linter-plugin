---
description: ルールの契約（defineRule・report・severity・options）と、ルールが見てよいもの
paths:
  - "packages/linter/src/**"
  - "packages/score-model/src/**"
---

# ルールの契約

型の正は `packages/linter/src/types.ts`、実行の約束は `packages/linter/src/engine.ts`。
ここには、型からは読めない約束だけを書く。

## 定義の形

`defineRule({ id, meta, options, run })`。`id` は kebab-case で、組み込みのルールの中で重複させない
（`createLinter` が throw する）。`meta.category` は `RuleCategory` 型の値
（`tempo` / `dynamics` / `articulation` / `slur-tie` / `notation`）。カテゴリを足すと、設定画面の並びとラベルの表
（`packages/lint-app/src/catalog.ts`）の書き忘れを型検査が知らせる。

```ts
export const xxx = defineRule({
  id: "xxx-check",
  meta: {
    name: "〇〇チェック", // 設定画面の表示名
    description: "〇〇を検出",
    category: "notation",
    severity: "warning", // このルールが出しうる最も重い severity
    defaultEnabled: true,
  },
  options: {}, // 設定項目の宣言。無ければ空
  run({ score, options, report }) {
    // ...
  },
});
```

- **`meta.severity` は実行前に設定画面へ出るので、実際の指摘から導けない。** 条件によって軽い
  severity も出すルールは、重いほうを `meta` に書き、軽い指摘だけ `report` の `severity` で下げる。
  `meta.severity` より重い指摘を報告するとエンジンが内部エラーにする。
- ルールが見てよいのは `score` と `options` だけ。`@score-linter/score-model` 以外を import しない
  （`.oxlintrc.json` の `no-restricted-imports` が弾く）。MuseScore の語彙（要素の種類・subtype）は持ち込まない。
- 奏法・強弱・テンポ・反復記号の表記揺れは `score-model` の `interpretAnnotation` が解釈済みの
  `Directive` にする。ルールは `annotation.directives` を見て、テキストの完全一致を書かない。
  足りない解釈はルールで補わず `interpret.ts` に足す。

## report

```ts
report({ at: { staff, measure, tick }, message, detail, severity });
```

- `at.measure` は小節の通し番号（`Measure.serial`）。`at.staff` を省くと楽譜全体への指摘。
- **`message` にパート名と小節番号を入れない。** 他の位置を指したいときは `{{measure:key}}`・`{{part:key}}`
  と書き、`detail[key]` に通し番号・譜表番号を入れる。表示は `lint-app` が行う。
- `detail` は JSON に直せる純データにする（CLI の JSON 出力と golden テストにそのまま出る）。
- `severity` を省くと `meta.severity`。

## options

`options` の宣言（`boolean` / `select` / `multiselect`）から `run` の `options` の型が推論され、
エンジンが正規化してから渡す。`run` の中で生の値を検証しない。宣言は純データに保つ
（QML の `Repeater` と `JSON.stringify` を通る）。設定画面と CLI の `--rule-option` はこの宣言だけを見る。

## severity 基準

| レベル    | 用途                                                                         |
| --------- | ---------------------------------------------------------------------------- |
| `error`   | 再生・出版に支障が出るレベルの漏れ（冒頭テンポなし、冒頭ダイナミクスなし等） |
| `warning` | on/off の対応漏れ（pizz. のまま終わる、senza sord. 忘れ等）                  |
| `info`    | あると望ましい記載の漏れ（複縦線等）                                         |

## 楽譜の引き方

- `score-model` の問い合わせ関数（`annotationsOn`・`annotationsAffecting`・`chordsOnStaff`・`slursOn` …）を使う。
  結果は `Score` ごとに `WeakMap` で覚えられる。`Score` は組み立てたあと書き換えない。
- 全譜表の全声部を毎回走査せず、必要な譜表・小節・種類で引く。
- ルール間で共有したい処理は `packages/linter/src/rules/support.ts` に置く。
  楽譜の解釈そのもの（ソースに依らないもの）なら `score-model` に置く。

## 追加の手順

`/rule-add` skill を参照。
