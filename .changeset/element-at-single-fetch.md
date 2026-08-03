---
"musescore-linter-plugin": patch
---

走査時に `elementAt` を 1 track につき 1 回しか引かないようにした。chord/rest 用と
barline 用で voice ループを 2 回回して同じ track を二度引いていた。呼び出し回数が
半減する（交響曲 5 番全曲で 30 万回 → 15 万回）。この呼び出しは QML↔C++ の境界を
越えるため 1 回あたり約 1.3 µs かかり、走査時間はほぼ回数で決まる。
イベントの生成順は変わらない。
