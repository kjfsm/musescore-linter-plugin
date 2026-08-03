---
"musescore-linter-plugin": minor
---

MusicXML 経路で、BPM も `<metronome>` も持たないテンポ語（「Allegro con brio」だけの `<direction>`）をテンポ表記として認識するようになりました。

これまでは通常のテキストとして扱われていたため、Sibelius / Finale などが書き出した MusicXML に対して「冒頭にテンポ表記がありません」(`opening-tempo`) が誤って報告されていました。CLI と Web 版が影響を受けます。

代わりに、BPM が書かれていないテンポ表記には `tempo-without-bpm` が反応するようになります（こちらは warning）。
