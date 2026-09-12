---
description: MuseScore 4.6 プラグイン API の罠と、それを踏まないための書き方
paths:
  - "ScoreLinter.qml"
  - "qml/**"
  - "packages/source-musescore/**"
---

# MuseScore 4.6 プラグイン API の罠

API の見た目どおりに書くと、実機(MuseScore 4.6)でだけ落ちる・効かないものを集める。
どれもエラーにならず、ログか数回後のクラッシュでしか分からないので、書く前にここを見る。

## 選択を変えるときは `startCmd()` / `endCmd()` で挟む

`curScore.selection.select()` を裸で呼ぶと、ログに `AccessibilityController::stateChanged | Inconsistent state`
が出て、数回クリックした後にクラッシュする(MuseScore #28807・#30922)。アクセシビリティツリーが
未コミットのまま、タイマーが古いポインタを辿るためである。`endCmd()` がスコア全体の更新を走らせるので、
挟めば古いポインタが残らない。`ScoreLinter.qml` のジャンプ処理(`selectRange`)がこの形になっている。

```js
curScore.startCmd();
curScore.selection.clear();
curScore.selection.select(note);
curScore.endCmd();
```

## `Chord` は選択できない

`Selection::select | Cannot select element of type Chord` がログに出て、何も選ばれない。
`elem.notes` があれば先頭の音符を選ぶ。

## プラグインのダイアログからは `cmd("note-input")` が届かない

ダイアログがフォーカスを持っているので、スコアエディタ向けのアクションは
`ActionsDispatcher::doDispatch | no one can handle the action` で捨てられる。`cmd()` でスクロールさせる
手口(musescore-todo-list の `cmd("note-input")` 2回)は 4.6 では動かない。`cmd("reset")` は通るが、
繰り返すとクラッシュする。

## スコアの要素をモデルに持たせない

`ListModel` などに入れた `cursor.element` は、QML の GC が C++ 側の参照を保たないので、後で `null` になる。
`tick`・`staffIdx` のようなスカラーだけを持ち、使うときに走査し直して要素を取り直す。

## プラグイン側で回避できないとき

回避策が SDK(`@kjfsm/musescore-plugin-sdk-helpers`)に置くべき形なら、CLAUDE.md の
「ライブラリ側の機能が不足している場合」に従い、ここで回避実装を足さずに報告する。
