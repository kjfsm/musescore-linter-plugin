---
"musescore-linter-plugin": patch
---

textPairChecker: on 状態未経験の off 指示を誤検出しないよう修正

"arco" や "ord." は複数チェッカー（sul-tasto-ord / sul-pont-ord / con-legno-arco）の offPatterns に共通して含まれている。pizz.→arco のように別の技法を解除する目的で "arco" を書いた場合、これらのチェッカーが「arco が既に指示済みの状態で再度指示されています」と誤検出していた。

on 状態を一度も経験していないパートに対しては off 指示の重複を報告しないよう `hasEverBeenOn` フラグを追加。
